import { Venue, VenueType } from '../data/types';
import { SportId } from './sports';

// ── Venue tier system ─────────────────────────────────────────────────────────
//
// Tier 1 — dedicated sports facility: run creation auto-accepted
// Tier 2 — shared / semi-public space: allowed with a community disclaimer
// Tier 3 — private / restricted / unsuitable: run creation blocked
//
// Frontend enforces tier and sport-compatibility before navigating to CreateRun.
// Backend TODO: mirror in Supabase RLS — runs table should enforce venue_id
// exists in venues table and venue tier != 3.

export type VenueTier = 1 | 2 | 3;

// ── Tier classification ───────────────────────────────────────────────────────

const TIER_MAP: Record<VenueType, VenueTier> = {
  // Tier 1 — dedicated facilities, auto-accept
  basketball_court:  1,
  tennis_court:      1,
  pickleball_court:  1,
  soccer_field:      1,
  football_field:    1,
  athletic_field:    1,
  gym:               1,
  recreation_center: 1,
  rec_center:        1,
  ymca:              1,
  sports_complex:    1,

  // Tier 2 — shared / semi-public, show disclaimer
  park_with_courts:  2,
  generic_park:      2,
  park:              2,
  school_athletics:  2,
  school:            2,
  community_center:  2,
  stadium:           2, // large public venue — typically needs authorization

  // Tier 3 — blocked
  private_facility:  3,
  private:           3,
};

export function getVenueTier(venue: Venue): VenueTier {
  return TIER_MAP[venue.venueType] ?? 2;
}

// ── Sport compatibility ───────────────────────────────────────────────────────
//
// Maps each venue type to the sports it can actually support.
// 'all' means the type imposes no constraint — use the venue's sports array as-is.
//
// Specific court/field types constrain to their intended sport(s) as a
// data-quality guard: e.g. a basketball_court listing 'swimming' in its sports
// array is bad data and should surface as incompatible rather than propagate
// to CreateRun.

const TYPE_SPORTS: Record<VenueType, SportId[] | 'all'> = {
  // Single-sport courts — strict
  basketball_court:  ['basketball'],
  tennis_court:      ['tennis'],
  pickleball_court:  ['pickleball'],
  soccer_field:      ['soccer', 'football'],
  football_field:    ['football', 'soccer'],

  // Multi-sport outdoor field
  athletic_field:    ['soccer', 'football', 'running'],

  // Indoor courts — indoor sports only
  gym:               ['basketball', 'volleyball', 'badminton'],

  // General-purpose facilities — no type-level constraint
  recreation_center: 'all',
  rec_center:        'all',
  ymca:              'all',
  sports_complex:    'all',

  // Public parks with courts — outdoor + racket sports
  park_with_courts:  ['basketball', 'tennis', 'pickleball', 'volleyball', 'running'],

  // Open-field parks — field sports and running only
  generic_park:      ['running', 'soccer', 'football'],

  // Legacy 'park' type — kept broad since existing venues (Rucker Park, Venice
  // Beach) have real courts and should not have sports stripped away.
  park:              'all',

  // School facilities — general but no swimming (pool access varies)
  school_athletics:  ['basketball', 'volleyball', 'soccer', 'running', 'tennis', 'football', 'badminton', 'pickleball'],
  school:            'all',

  // Community centers — indoor court sports
  community_center:  ['basketball', 'volleyball', 'badminton'],

  // Stadiums — spectator venues, some have public fields
  stadium:           ['soccer', 'football', 'running'],

  // Blocked — compatibility is irrelevant but needs an entry
  private_facility:  'all',
  private:           'all',
};

// Returns the intersection of a venue's listed sports and the sports that are
// actually compatible with its type. For 'all' types, returns venue.sports
// unchanged. For specific types, filters out sports the facility cannot support.
export function getValidSports(venue: Venue): SportId[] {
  const compatible = TYPE_SPORTS[venue.venueType];
  if (compatible === 'all') return venue.sports;
  return venue.sports.filter((s) => compatible.includes(s));
}

// Checks whether a single sport is valid at a venue (type-compatible AND listed).
export function isVenueSportCompatible(venue: Venue, sport: SportId): boolean {
  return getValidSports(venue).includes(sport);
}

// ── Tier UI config ────────────────────────────────────────────────────────────

export const TIER_CONFIG = {
  1: {
    label: 'Dedicated Facility',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    icon: 'checkmark-circle-outline' as const,
  },
  2: {
    label: 'Public Space',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    icon: 'information-circle-outline' as const,
  },
  3: {
    label: 'Private Facility',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.10)',
    icon: 'lock-closed-outline' as const,
  },
} as const;

// ── User-facing copy ──────────────────────────────────────────────────────────

export const TIER_2_DISCLAIMER =
  'Public space — runs here are community-organized and first-come first-served. Check availability before bringing others.';

export const TIER_3_REASON =
  'Run creation is not available at private facilities. Find a public park, rec center, or sports complex nearby.';

export const NO_COMPATIBLE_SPORTS_REASON =
  'This location is not set up for any sports this app currently supports.';
