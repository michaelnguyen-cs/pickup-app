// SavedContext — persists saved venue and run IDs
//
// Storage strategy (auth-aware):
//   Signed in  → Supabase saved_venues / saved_runs tables, scoped to user_id
//   Guest      → AsyncStorage for venues only; runs silently no-op (no guest fallback)
//
// Auth transitions:
//   Sign in    → reload both sets from Supabase
//   Sign out   → reload venues from AsyncStorage, clear run saves
//
// Toggle behaviour:
//   Optimistic update fires immediately so the bookmark icon flips with no delay.
//   If the Supabase write fails the optimistic update is rolled back.
//   AsyncStorage venue writes are fire-and-forget (same as before).
//   Run saves require auth; guest taps are a no-op.
//
// Type caveats:
//   supabase-js v2.103 infers the row type as `never` for composite-PK tables
//   (saved_venues, saved_runs) when using hand-written Database types. The same
//   `as { field: type }[]` cast and `as any` insert workarounds are applied
//   consistently across both tables.
//
// Interface unchanged — all consumers work without modification.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthContext';

const VENUE_STORAGE_KEY = '@pickup/saved_venues';

interface SavedContextValue {
  // ── Venue saves ───────────────────────────────────────────────────────────
  savedIds: Set<string>;
  isSaved: (venueId: string) => boolean;
  toggleSaved: (venueId: string) => Promise<void>;
  // ── Run saves ─────────────────────────────────────────────────────────────
  savedRunIds: Set<string>;
  isRunSaved: (runId: string) => boolean;
  toggleRunSaved: (runId: string) => Promise<void>;
  // ── Loading state ─────────────────────────────────────────────────────────
  isLoaded: boolean;
}

const SavedContext = createContext<SavedContextValue>({
  savedIds: new Set(),
  isSaved: () => false,
  toggleSaved: async () => {},
  savedRunIds: new Set(),
  isRunSaved: () => false,
  toggleRunSaved: async () => {},
  isLoaded: false,
});

export function useSavedContext(): SavedContextValue {
  return useContext(SavedContext);
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuthContext();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedRunIds, setSavedRunIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load both venue and run saves from the appropriate source in one pass.
  const loadSaves = useCallback(async (userId: string | null) => {
    setIsLoaded(false);
    try {
      if (userId) {
        // Fetch both tables in parallel
        const [venueResult, runResult] = await Promise.all([
          supabase.from('saved_venues').select('*').eq('user_id', userId),
          supabase.from('saved_runs').select('*').eq('user_id', userId),
        ]);

        // SDK v2.103 infers row type as `never` for composite-PK tables — cast explicitly
        setSavedIds(new Set(
          ((venueResult.data ?? []) as { venue_id: string }[]).map((r) => r.venue_id)
        ));
        setSavedRunIds(new Set(
          ((runResult.data ?? []) as { run_id: string }[]).map((r) => r.run_id)
        ));
      } else {
        // Guest: venues from AsyncStorage, runs always empty (no local run saves)
        const raw = await AsyncStorage.getItem(VENUE_STORAGE_KEY);
        setSavedIds(raw ? new Set<string>(JSON.parse(raw)) : new Set());
        setSavedRunIds(new Set());
      }
    } catch {
      // Network or storage failure — keep whatever was in state
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Reload whenever auth state settles or user identity changes.
  // authLoading guard prevents a false "guest" load before the session is known.
  useEffect(() => {
    if (authLoading) return;
    loadSaves(user?.id ?? null);
  }, [user?.id, authLoading, loadSaves]);

  // ── Venue toggle ───────────────────────────────────────────────────────────

  const toggleSaved = useCallback(
    async (venueId: string) => {
      const userId = user?.id ?? null;
      const wasAlreadySaved = savedIds.has(venueId);

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(venueId)) { next.delete(venueId); } else { next.add(venueId); }
        return next;
      });

      if (userId) {
        if (wasAlreadySaved) {
          const { error } = await supabase
            .from('saved_venues')
            .delete()
            .match({ user_id: userId, venue_id: venueId });
          if (error) {
            setSavedIds((prev) => new Set([...prev, venueId]));
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase
            .from('saved_venues')
            .insert({ user_id: userId, venue_id: venueId } as any);
          if (error) {
            setSavedIds((prev) => { const next = new Set(prev); next.delete(venueId); return next; });
          }
        }
      } else {
        const nextIds = new Set(savedIds);
        if (wasAlreadySaved) { nextIds.delete(venueId); } else { nextIds.add(venueId); }
        AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify([...nextIds])).catch(() => {});
      }
    },
    [user?.id, savedIds]
  );

  // ── Run toggle ─────────────────────────────────────────────────────────────

  const toggleRunSaved = useCallback(
    async (runId: string) => {
      const userId = user?.id ?? null;
      if (!userId) return; // Run saves require auth; no guest fallback

      const wasAlreadySaved = savedRunIds.has(runId);

      setSavedRunIds((prev) => {
        const next = new Set(prev);
        if (next.has(runId)) { next.delete(runId); } else { next.add(runId); }
        return next;
      });

      if (wasAlreadySaved) {
        const { error } = await supabase
          .from('saved_runs')
          .delete()
          .match({ user_id: userId, run_id: runId });
        if (error) {
          setSavedRunIds((prev) => new Set([...prev, runId]));
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from('saved_runs')
          .insert({ user_id: userId, run_id: runId } as any);
        if (error) {
          setSavedRunIds((prev) => { const next = new Set(prev); next.delete(runId); return next; });
        }
      }
    },
    [user?.id, savedRunIds]
  );

  const isSaved = useCallback((venueId: string) => savedIds.has(venueId), [savedIds]);
  const isRunSaved = useCallback((runId: string) => savedRunIds.has(runId), [savedRunIds]);

  return (
    <SavedContext.Provider
      value={{ savedIds, isSaved, toggleSaved, savedRunIds, isRunSaved, toggleRunSaved, isLoaded }}
    >
      {children}
    </SavedContext.Provider>
  );
}
