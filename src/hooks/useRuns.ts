// useRuns — fetches all recurring runs from Supabase on mount
// Returns the run list, loading state, any error, and a manual refetch trigger.

import { useState, useEffect, useCallback } from 'react';
import { RecurringRun } from '../data/types';
import { fetchRuns } from '../lib/queries/runs';

export interface UseRunsResult {
  runs: RecurringRun[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRuns(): UseRunsResult {
  const [runs, setRuns] = useState<RecurringRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRuns();
      setRuns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { runs, isLoading, error, refetch: load };
}
