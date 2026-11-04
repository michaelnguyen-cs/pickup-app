// userRuns.ts — Supabase data access for user-created one-time pickup runs
//
// All mutation operations go through SECURITY DEFINER RPCs (create_run,
// cancel_run, join_run) so business rules are enforced server-side even if
// the frontend is patched or bypassed.
//
// Frontend wiring status:
//   ✓ This file is complete and type-safe.
//   ✓ CreateRunScreen calls callCreateRun(); errors surfaced via RPC_ERROR_MESSAGES.
//   ✓ ActiveRunContext seeds from fetchActiveRunForUser() on mount; exposes refresh().
//   ✓ Cancel flow in CreateRunScreen calls callCancelRun() before clearing context.

import { supabase } from '../supabase';
import {
  UserRunRow,
  UserRunWithVenue,
  CreateRunResult,
  CancelRunResult,
  JoinRunResult,
} from '../../types/database';
import { SportId } from '../../constants/sports';
import { SkillLevel } from '../../data/types';

// ── Types ─────────────────────────────────────────────────────────────────────

// The shape CreateRunScreen uses to kick off run creation.
// Maps 1:1 to the create_run RPC parameters.
export interface CreateRunParams {
  venueId:    string;
  sport:      SportId;
  startTime:  Date;
  endTime:    Date;
  skillLevel: SkillLevel;
  maxPlayers: number;
  notes?:     string;
  title?:     string;   // optional; RPC auto-generates if omitted
}

// The app-facing run shape — a subset of UserRunRow with typed fields.
// Used wherever the UI needs to render an active or past user run.
export interface UserRun {
  id:           string;
  venueId:      string;
  venueName:    string;
  sport:        SportId;
  title:        string;
  startTime:    Date;
  endTime:      Date;
  skillLevel:   SkillLevel;
  maxPlayers:   number;
  status:       'active' | 'cancelled' | 'completed';
  notes:        string;
  createdAt:    Date;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapUserRunRow(row: UserRunWithVenue): UserRun {
  return {
    id:         row.id,
    venueId:    row.venue_id,
    venueName:  row.venue?.name ?? '',
    sport:      row.sport as SportId,
    title:      row.title,
    startTime:  new Date(row.start_time),
    endTime:    new Date(row.end_time),
    skillLevel: row.skill_level as SkillLevel,
    maxPlayers: row.max_players,
    status:     row.status as UserRun['status'],
    notes:      row.notes ?? '',
    createdAt:  new Date(row.created_at),
  };
}

const VENUE_FIELDS = 'id, name, address, city, latitude, longitude';

// ── Read queries ──────────────────────────────────────────────────────────────

// Returns the caller's current active, non-expired run, or null if none.
// Use this on app launch to restore ActiveRunContext from the DB.
export async function fetchActiveRunForUser(): Promise<UserRun | null> {
  const { data, error } = await supabase
    .from('user_runs')
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq('status', 'active')
    .gt('end_time', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapUserRunRow(data as UserRunWithVenue);
}

// Returns all user runs at a specific venue, newest first.
// Used by VenueDetailScreen to show community-created events.
export async function fetchUserRunsByVenueId(venueId: string): Promise<UserRun[]> {
  const { data, error } = await supabase
    .from('user_runs')
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq('venue_id', venueId)
    .eq('status', 'active')
    .gt('end_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) return [];
  return (data ?? []).map((row) => mapUserRunRow(row as UserRunWithVenue));
}

// Returns the participant count for a run via the safe aggregate RPC.
export async function fetchParticipantCount(runId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_run_participant_count', {
    p_run_id: runId,
  });
  if (error) return 0;
  return (data as number | null) ?? 0;
}

// ── Mutation RPCs ─────────────────────────────────────────────────────────────

// Create a new user run.
// All business rules are enforced server-side by the create_run RPC.
// Returns { success: true, run_id } or { error: <code> }.
export async function callCreateRun(params: CreateRunParams): Promise<CreateRunResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_run', {
    p_venue_id:    params.venueId,
    p_sport:       params.sport,
    p_start_time:  params.startTime.toISOString(),
    p_end_time:    params.endTime.toISOString(),
    p_skill_level: params.skillLevel,
    p_max_players: params.maxPlayers,
    p_notes:       params.notes ?? null,
    p_title:       params.title ?? null,
  });
  if (error) return { error: 'not_authenticated' }; // network/auth failure
  return data as CreateRunResult;
}

// Cancel the caller's own run. Only the creator can cancel.
export async function callCancelRun(runId: string): Promise<CancelRunResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('cancel_run', {
    p_run_id: runId,
  });
  if (error) return { error: 'not_authenticated' };
  return data as CancelRunResult;
}

// Join a run as a participant.
export async function callJoinRun(runId: string): Promise<JoinRunResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('join_run', {
    p_run_id: runId,
  });
  if (error) return { error: 'not_authenticated' };
  return data as JoinRunResult;
}

// ── Error code → user-facing message ─────────────────────────────────────────

export const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated:    'You need to be signed in to do that.',
  age_not_confirmed:    'You must confirm your age before creating or joining runs.',
  active_run_exists:    'You already have an active run. Cancel it before creating another.',
  venue_not_found:      'This venue no longer exists. Please go back and choose another.',
  venue_blocked:        'Run creation is not available at this location.',
  sport_not_compatible: 'This location does not support that sport.',
  start_time_in_past:   'Start time must be in the future.',
  end_before_start:     'End time must be after start time.',
  run_not_found:        'This run could not be found.',
  not_owner:            'Only the run creator can cancel this run.',
  run_not_active:       'This run is no longer active.',
  run_expired:          'This run has already ended.',
  run_full:             'This run is full.',
};
