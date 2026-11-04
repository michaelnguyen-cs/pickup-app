import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRun, fetchActiveRunForUser } from '../lib/queries/userRuns';

// UserRun is the canonical active-run shape — aliased here for local consumers.
export type ActiveRun = UserRun;

type ActiveRunContextType = {
  activeRun: ActiveRun | null;
  isLoading: boolean;
  setActiveRun: (run: ActiveRun | null) => void;
  refresh: () => Promise<void>;
};

const ActiveRunContext = createContext<ActiveRunContextType>({
  activeRun: null,
  isLoading: true,
  setActiveRun: () => {},
  refresh: async () => {},
});

export function ActiveRunProvider({ children }: { children: React.ReactNode }) {
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const run = await fetchActiveRunForUser();
    setActiveRun(run);
  }, []);

  useEffect(() => {
    fetchActiveRunForUser()
      .then((run) => setActiveRun(run))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ActiveRunContext.Provider value={{ activeRun, isLoading, setActiveRun, refresh }}>
      {children}
    </ActiveRunContext.Provider>
  );
}

export function useActiveRun() {
  return useContext(ActiveRunContext);
}
