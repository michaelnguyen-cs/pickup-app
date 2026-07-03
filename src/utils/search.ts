// search.ts — ranked venue search
//
// Scoring signals (higher = better match):
//   name exact / prefix / substring   — 100 / 60 / 30
//   sport label prefix / substring    — 40 / 20
//   sport ID prefix / substring       — 35 / 15
//   city prefix / substring           — 20 / 10
//   tag prefix / substring            — 12 / 6
//   description substring             — 4
//   popularity tiebreaker             — 0–10 (popularityScore / 10)
//   proximity bonus (< 5 mi / < 25 mi) — 15 / 5   (only if coords available)
//
// Venues with score 0 (no signal matched) are excluded entirely.

import { Venue, Coordinates } from '../data/types';
import { SPORT_MAP, SportId } from '../constants/sports';
import { haversineDistance } from './formatting';

function scoreVenue(venue: Venue, q: string, coords?: Coordinates | null): number {
  const name = venue.name.toLowerCase();
  const city = venue.city.toLowerCase();
  let score = 0;

  // Name
  if (name === q)              score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q))   score += 30;

  // City
  if (city.startsWith(q))      score += 20;
  else if (city.includes(q))   score += 10;

  // Sports
  for (const sportId of venue.sports) {
    const label = (SPORT_MAP[sportId as SportId]?.label ?? '').toLowerCase();
    if (label.startsWith(q))       score += 40;
    else if (label.includes(q))    score += 20;
    if (sportId.startsWith(q))     score += 35;
    else if (sportId.includes(q))  score += 15;
  }

  // Tags
  for (const tag of venue.tags) {
    const t = tag.toLowerCase();
    if (t.startsWith(q))     score += 12;
    else if (t.includes(q))  score += 6;
  }

  // Description (lowest signal)
  if (venue.description.toLowerCase().includes(q)) score += 4;

  if (score === 0) return 0;

  // Tiebreakers — only applied when something already matched
  score += (venue.popularityScore ?? 0) / 10;

  if (coords) {
    const dist = haversineDistance(coords, venue.coordinates);
    if (dist < 5)       score += 15;
    else if (dist < 25) score += 5;
  }

  return score;
}

// Returns venues that match the query, sorted by relevance (best first).
// Returns the original array unchanged when query is blank.
export function rankSearch(
  venues: Venue[],
  query: string,
  coords?: Coordinates | null,
): Venue[] {
  const q = query.trim().toLowerCase();
  if (!q) return venues;

  return venues
    .map((v) => ({ venue: v, score: scoreVenue(v, q, coords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ venue }) => venue);
}
