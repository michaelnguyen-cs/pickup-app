// useVenues — fetches all venues from Supabase on mount
// Returns the venue list, loading state, any error, and a manual refetch trigger.

import { useState, useEffect, useCallback } from 'react';
import { Venue } from '../data/types';
import { fetchVenues } from '../lib/queries/venues';

export interface UseVenuesResult {
  venues: Venue[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVenues(): UseVenuesResult {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVenues();
      setVenues(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load venues');
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { venues, isLoading, error, refetch: load };
}
