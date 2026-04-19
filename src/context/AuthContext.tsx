// AuthContext — Supabase session and user profile state
//
// Pattern:
//   1. supabase.auth.getSession()  → fast initial check, avoids blank screen
//   2. onAuthStateChange()         → single source of truth for all future events
//      fires: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
//
// Profile loading:
//   After any sign-in, fetches the user's row from public.profiles.
//   The auto-create trigger (handle_new_user) ensures the row exists,
//   so a missing profile row is treated as an empty profile, not an error.
//
// Usage:
//   const { user, profile, signIn, signOut } = useAuthContext();
//   if (!user) navigation.navigate('SignIn');

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ProfileRow } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  // true only during the initial session-from-storage check
  isLoading: boolean;
  // Returns an error message string on failure, null on success
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  // Re-fetches the profile row — call after updating profile data
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Fast initial check — reads from AsyncStorage synchronously-ish
    // Resolves before onAuthStateChange fires, preventing a blank flash
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial);
      setUser(initial?.user ?? null);
      // If no session, we're done loading immediately
      if (!initial) setIsLoading(false);
      // If there is a session, onAuthStateChange will handle profile + setIsLoading
    });

    // Single source of truth for all auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      // Mark loading complete after the first auth event resolves
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error?.message ?? null;
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      return error?.message ?? null;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isLoading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
