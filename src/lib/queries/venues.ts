// venues.ts — Supabase data access for the venues table
//
// mapVenueRow() bridges the DB schema to the existing Venue interface so
// every component and utility that already works with Venue keeps working.
//
// Known schema gaps (resolved when DB schema expands):
//   - indoorOutdoor: DB has boolean is_indoor; 'both' can't be expressed yet
//   - amenities / tags / phone / website: not in schema yet, defaulted to []

import { supabase } from '../supabase';
import { Venue } from '../../data/types';
import { VenueRow } from '../../types/database';
import { SportId } from '../../constants/sports';

// scripts/import-venues.ts prepends this to `description` when a venue's
// is_indoor value was unverified at import time (see UNVERIFIED_INDOOR_FLAG
// there). It's an internal QA breadcrumb for admins reviewing import
// candidates — never meant for end users, so strip it before display. The
// raw, flagged value stays in the DB untouched.
const UNVERIFIED_INDOOR_QA_PREFIX = '⚠ is_indoor unverified — needs manual review.';

function stripQaPrefix(description: string): string {
  return description.startsWith(UNVERIFIED_INDOOR_QA_PREFIX)
    ? description.slice(UNVERIFIED_INDOOR_QA_PREFIX.length).trim()
    : description;
}

function mapVenueRow(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    shortName: row.name.split(' ').slice(0, 2).join(' '),
    venueType: 'rec_center',            // DB schema doesn't have this yet
    // sports[] is the source of truth; sport_id is a fallback for rows where
    // sports[] hasn't been backfilled (null or empty).
    sports: (row.sports && row.sports.length > 0 ? row.sports : [row.sport_id]) as SportId[],
    address: row.address,
    city: row.city,
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude,
    },
    indoorOutdoor: row.is_indoor ? 'indoor' : 'outdoor',
    imageUrl: row.image_url ?? '',
    description: row.description ? stripQaPrefix(row.description) : '',
    amenities: [],                      // not in schema yet
    // popularity_score defaults to 50 for every auto-imported venue (see
    // scripts/import-venues.ts) — that's a placeholder, not a measured
    // signal. Only trust it for manually-curated venues (import_source
    // null); otherwise treat it as unknown, same honesty principle as
    // RecurringRun.typicalTurnout/popularityScore (lib/queries/runs.ts).
    popularityScore: row.import_source ? null : row.popularity_score,
    tags: [],                           // not in schema yet
    createdAt: row.created_at,
  };
}

// Fetch all venues ordered by popularity descending
export async function fetchVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('popularity_score', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVenueRow);
}

// Fetch a single venue by its UUID
export async function fetchVenueById(id: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapVenueRow(data);
}
