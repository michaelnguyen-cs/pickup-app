// PrefsContext — stores user preferences and onboarding completion state
//
// Storage keys:
//   '@pickup/onboarding_complete' — 'true' once the flow is finished
//   '@pickup/user_prefs'          — JSON of UserPrefs
//
// Supabase migration path:
//   Replace AsyncStorage writes with:
//     supabase.from('user_profiles').upsert({ user_id, sports, skill_level, indoor_outdoor })
//   And read on login instead of on mount.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SportId } from '../constants/sports';
import { SkillLevel, IndoorOutdoor } from '../data/types';

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
  isLoaded: boolean; // false during the initial AsyncStorage read
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
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load both keys from storage on mount
  useEffect(() => {
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
        // Storage failure — fall through to defaults
      })
      .finally(() => setIsLoaded(true));
  }, []);

  // In-memory update during onboarding (not persisted until completeOnboarding)
  const updatePrefs = useCallback((updates: Partial<UserPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...updates }));
  }, []);

  // Called on the last onboarding screen — persists everything
  const completeOnboarding = useCallback(async (finalPrefs: UserPrefs) => {
    setPrefs(finalPrefs);
    try {
      await AsyncStorage.multiSet([
        [ONBOARDING_KEY, 'true'],
        [PREFS_KEY, JSON.stringify(finalPrefs)],
      ]);
    } catch {
      // Storage failure — still mark as onboarded in memory
    }
    setHasOnboarded(true);
  }, []);

  return (
    <PrefsContext.Provider value={{ prefs, hasOnboarded, isLoaded, updatePrefs, completeOnboarding }}>
      {children}
    </PrefsContext.Provider>
  );
}
