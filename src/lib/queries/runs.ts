// runs.ts — Supabase data access for the runs table
//
// Each DB row is one time slot (day_of_week + start_time + end_time).
// mapRunRow() wraps it into RecurringRun with a single-entry schedule array
// so getVenueStatusBadge() and the schedule UI keep working unchanged.
//
// Known schema gaps (resolved when DB schema expands):
//   - typicalTurnout / maxPlayers / popularityScore / isVerified: not in schema, defaulted
//   - costPerSession: not in schema, defaulted to 0 (free)
//   - status: not in schema, hardcoded 'active' (required by getVenueStatusBadge filter)
//   - tags: not in schema, defaulted to []

import { supabase } from '../supabase';
import { RecurringRun, DayOfWeek, SkillLevel } from '../../data/types';
import { RunRow, VenueRow } from '../../types/database';
import { SportId } from '../../constants/sports';

// Shape returned by the joined SELECT — run row + partial venue
type RunQueryRow = RunRow & {
  venue: Pick<VenueRow, 'id' | 'name' | 'address' | 'city' | 'latitude' | 'longitude'> | null;
};

const VENUE_FIELDS = 'id, name, address, city, latitude, longitude';

function mapRunRow(row: RunQueryRow): RecurringRun {
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: row.venue?.name ?? '',
    venueCoordinates: {
      latitude: row.venue?.latitude ?? 0,
      longitude: row.venue?.longitude ?? 0,
    },
    sport: row.sport_id as SportId,
    name: row.title,
    description: row.notes ?? '',
    schedule: [
      {
        day: row.day_of_week as DayOfWeek,
        startTime: row.start_time,
        endTime: row.end_time,
      },
    ],
    skillLevel: row.skill_level as SkillLevel,
    typicalTurnout: null,     // not in schema yet
    costPerSession: 0,        // not in schema yet
    status: 'active',         // required by getVenueStatusBadge filter
    popularityScore: null,    // not in schema yet
    tags: [],                 // not in schema yet
    isVerified: false,        // not in schema yet
    isIndoor: row.is_indoor,
    createdAt: row.created_at,
    confidenceScore: row.confidence_score ?? null,
    lastVerifiedAt: row.last_verified_at ?? null,
  };
}

// Fetch all runs ordered by creation date descending
export async function fetchRuns(): Promise<RecurringRun[]> {
  const { data, error } = await supabase
    .from('runs')
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRunRow(row as RunQueryRow));
}

// Fetch a single run by its UUID
export async function fetchRunById(id: string): Promise<RecurringRun | null> {
  const { data, error } = await supabase
    .from('runs')
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapRunRow(data as RunQueryRow);
}

// Fetch all runs at a specific venue
export async function fetchRunsByVenueId(venueId: string): Promise<RecurringRun[]> {
  const { data, error } = await supabase
    .from('runs')
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq('venue_id', venueId)
    .order('day_of_week', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRunRow(row as RunQueryRow));
}
