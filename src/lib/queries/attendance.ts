// attendance.ts — query layer for run_attendance
//
// run_attendance has a user-scoped SELECT policy, so direct .select() only
// returns the current user's row. Aggregate reads go through SECURITY DEFINER
// RPC functions that return only counts — no individual user data exposed.

import { supabase } from '../supabase';

// Returns the number of users confirmed attending a run.
// Fails silently and returns 0 — count is non-critical UI.
export async function fetchRunAttendanceCount(runId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_run_attendance_count', {
    p_run_id: runId,
  });
  if (error) return 0;
  return (data as number | null) ?? 0;
}
