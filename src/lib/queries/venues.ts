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
    description: row.description ?? '',
    amenities: [],                      // not in schema yet
    popularityScore: row.popularity_score,
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
