// reports.ts — query layer for run_reports
//
// run_reports has a user-scoped SELECT policy, so a direct .select() would
// only return the current user's reports. fetchRunRecentReportCount uses an
// RPC function (SECURITY DEFINER) to count across all users safely.

import { supabase } from '../supabase';

// Returns the number of reports filed against a run in the past 30 days.
// Fails silently and returns 0 — report count is non-critical UI; a network
// error should not break the run detail screen.
export async function fetchRunRecentReportCount(runId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_run_recent_report_count', {
    p_run_id: runId,
  });
  if (error) return 0;
  return (data as number | null) ?? 0;
}
