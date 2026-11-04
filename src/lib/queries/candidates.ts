// candidates.ts — query layer for run_candidates admin review
//
// run_candidates has no user-facing RLS policies, so all reads go through
// the get_pending_run_candidates() SECURITY DEFINER RPC function.
// Approve / reject / flag call the Phase 7 SQL functions directly.

import { supabase } from '../supabase';

// Shape returned by get_pending_run_candidates() — a subset of run_candidates
// joined with the venue name. Does not include raw_text / extracted_json
// (large fields not needed for the list UI).
export interface CandidateListItem {
  id: string;
  venue_id: string | null;
  venue_name: string | null;
  title: string;
  sport_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  skill_level: string;
  is_indoor: boolean;
  notes: string | null;
  source_url: string | null;
  source_name: string | null;
  source_type: string;
  confidence_score: number;
  needs_review: boolean;
  review_status: string;
  last_seen_at: string;
  created_at: string;
}

// Fetch all candidates with review_status = 'pending' | 'needs_clarification'
// Ordered: needs_review DESC, confidence_score ASC (most uncertain first)
export async function fetchPendingCandidates(): Promise<CandidateListItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_pending_run_candidates');
  if (error) throw new Error(error.message);
  return (data ?? []) as CandidateListItem[];
}

// Promote a candidate to a live run.
// p_venue_id is required when the candidate's venue_id is null.
// Returns the newly created run's UUID.
export async function approveCandidateRpc(
  candidateId: string,
  reviewerId: string,
  venueId?: string
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('approve_run_candidate', {
    p_candidate_id: candidateId,
    p_reviewer_id: reviewerId,
    p_venue_id: venueId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// Mark a candidate rejected. Idempotent — safe to call twice.
export async function rejectCandidateRpc(
  candidateId: string,
  reviewerId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('reject_run_candidate', {
    p_candidate_id: candidateId,
    p_reviewer_id: reviewerId,
  });
  if (error) throw new Error(error.message);
}

// Set review_status = 'needs_clarification'. Optional note is appended to
// the candidate's existing notes field.
export async function flagCandidateRpc(
  candidateId: string,
  reviewerId: string,
  note?: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('flag_run_candidate_for_clarification', {
    p_candidate_id: candidateId,
    p_reviewer_id: reviewerId,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
}
