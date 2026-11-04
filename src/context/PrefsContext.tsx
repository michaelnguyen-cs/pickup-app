// PrefsContext — stores user preferences and onboarding completion state
//
// Storage strategy (auth-aware):
//   Signed in  → load prefs from the profiles row already fetched by AuthContext
//              → write to Supabase on completeOnboarding
//              → hasOnboarded derived from whether profile.sports is set
//   Guest      → AsyncStorage for prefs and onboarding flag (unchanged)
//
// Auth transitions:
//   Sign in    → reseed prefs from profile row (AuthContext awaits the fetch
//                before clearing isLoading, so profile is always ready)
//   Sign out   → reload prefs from AsyncStorage
//
// updatePrefs stays in-memory only (used during onboarding steps).
// completeOnboarding flushes to Supabase (if authed) AND AsyncStorage.

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
import { SportId } from '../constants/sports';
import { SkillLevel, IndoorOutdoor } from '../data/types';
import { useAuthContext } from './AuthContext';

const ONBOARDING_KEY = '@pickup/onboarding_complete';
const PREFS_KEY = '@pickup/user_prefs';

export interface UserPrefs {
  sports: SportId[];
  skillLevel: SkillLevel | null;
  indoorOutdoor: IndoorOutdoor | null;
}

const DEFAULT_PREFS: UserPrefs = {
  sports: [],
  skillLevel: null,
  indoorOutdoor: null,
};

interface PrefsContextValue {
  prefs: UserPrefs;
  hasOnboarded: boolean;
  isLoaded: boolean;
  updatePrefs: (updates: Partial<UserPrefs>) => void;
  completeOnboarding: (finalPrefs: UserPrefs) => Promise<void>;
}

const PrefsContext = createContext<PrefsContextValue>({
  prefs: DEFAULT_PREFS,
  hasOnboarded: false,
  isLoaded: false,
  updatePrefs: () => {},
  completeOnboarding: async () => {},
});

export function usePrefsContext(): PrefsContextValue {
  return useContext(PrefsContext);
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuthContext();
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reseed prefs whenever auth state settles or the user identity changes.
  // authLoading guard prevents loading before the session is known.
  // profile is not listed as a dep intentionally — we only reseed on identity
  // changes, not on every refreshProfile() call mid-session.
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // AuthContext awaits loadProfile() before clearing isLoading, so profile
      // is guaranteed to be set (or null if the row is somehow missing) here.
      setPrefs({
        sports: Array.isArray(profile?.sports) ? (profile.sports as SportId[]) : [],
        skillLevel: (profile?.skill_level as SkillLevel | null) ?? null,
        indoorOutdoor: (profile?.indoor_outdoor as IndoorOutdoor | null) ?? null,
      });
      // Treat a non-empty sports array as evidence that onboarding was completed
      setHasOnboarded(
        Array.isArray(profile?.sports) && (profile?.sports as string[]).length > 0
      );
      setIsLoaded(true);
    } else {
      // Guest — fall back to AsyncStorage
      setIsLoaded(false);
      Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(PREFS_KEY),
      ])
        .then(([onboarded, prefsRaw]) => {
          if (onboarded === 'true') setHasOnboarded(true);
          if (prefsRaw) {
            try {
              setPrefs(JSON.parse(prefsRaw));
            } catch {
              // Corrupted prefs — start fresh
            }
          }
        })
        .catch(() => {
          // Storage failure — use defaults
        })
        .finally(() => setIsLoaded(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // In-memory update during onboarding steps (not persisted until completeOnboarding)
  const updatePrefs = useCallback((updates: Partial<UserPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...updates }));
  }, []);

  // Called on the last onboarding screen — persists everything
  const completeOnboarding = useCallback(
    async (finalPrefs: UserPrefs) => {
      setPrefs(finalPrefs);
      setHasOnboarded(true);

      // Always write to AsyncStorage (offline / guest fallback)
      try {
        await AsyncStorage.multiSet([
          [ONBOARDING_KEY, 'true'],
          [PREFS_KEY, JSON.stringify(finalPrefs)],
        ]);
      } catch {
        // Storage failure — prefs live in memory
      }

      // Also persist to Supabase if authenticated
      if (user) {
        // Upsert handles the edge case where the trigger-created row is missing.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any).upsert({
          id: user.id,
          sports: finalPrefs.sports,
          skill_level: finalPrefs.skillLevel,
          indoor_outdoor: finalPrefs.indoorOutdoor,
        });
        // Keep AuthContext.profile consistent with what we just wrote
        await refreshProfile();
      }
    },
    [user, refreshProfile]
  );

  return (
    <PrefsContext.Provider value={{ prefs, hasOnboarded, isLoaded, updatePrefs, completeOnboarding }}>
      {children}
    </PrefsContext.Provider>
  );
}
