/// <reference types="node" />
// scripts/import-venues.ts
//
// Volleyball venue import for Massachusetts + New Hampshire.
//
// Sources:
//   - Google Places API (New) Text Search — one call per grid point (see below)
//   - OpenStreetMap Overpass API           — one bounding-box query for the whole region
//
// Usage:
//   npx tsx scripts/import-venues.ts             # dry run — writes scripts/output/venues-preview.json only
//   npx tsx scripts/import-venues.ts --apply      # inserts new (status === 'new') venues into Supabase
//
// Requires scripts/.env — see scripts/.env.example and scripts/README.md.
// Never reads from the app's .env.local. This script is intentionally standalone.
//
// ─────────────────────────────────────────────────────────────────────────────
// Design notes
// ─────────────────────────────────────────────────────────────────────────────
//
// Grid: Google Places Text Search (New) has no "search this whole region" mode —
// each call is biased around a single point and returns up to ~20 results. To
// cover MA + NH we tile each state's bounding box with points spaced
// GRID_SPACING_MILES apart and issue one call per point. This is exactly what
// the 200-call hard cap below is protecting against: grid density × query
// variants can add up fast, and Places API calls cost money.
//
// Overpass has no such per-call radius/result cap — a single query can request
// every matching element inside an arbitrary bounding box in one response. So
// instead of hundreds of small `around:` calls (redundant load on a shared free
// public service), we issue exactly one bounding-box query spanning the same
// region the grid covers.
//
// Schema convention match: existing seed data stores `city` as "City, ST"
// (e.g. "New York, NY") and `state` as the bare abbreviation ("NY") — see
// supabase/seed.sql and src/screens/VenueDetailScreen.tsx, which renders
// `${venue.address}, ${venue.city}`. This script replicates that convention
// so imported rows render identically to existing venues.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const GRID_SPACING_MILES = 15;
const GOOGLE_CALL_HARD_CAP = 200;
const GOOGLE_CALL_DELAY_MS = 120; // politeness delay between Places calls
const GOOGLE_SEARCH_RADIUS_METERS = GRID_SPACING_MILES * 1609.34; // overlapping coverage between adjacent grid points

// Kept short and singular by default so (grid points × variants) stays under
// the 200-call cap for the full MA+NH grid. Add variants at your own risk —
// the hard cap will truncate the run (with a warning) rather than overspend,
// but a truncated run means incomplete state coverage.
const GOOGLE_QUERY_VARIANTS = ['volleyball'];

const DEDUPE_DISTANCE_MILES = 0.1; // ~528 ft — candidates/existing venues closer than this are treated as the same place

// Approximate state bounding boxes (rectangle, not the true polygon — good
// enough for grid generation and a single Overpass bbox query; some ocean/
// neighboring-state slack at the edges is expected and harmless).
const STATE_BBOXES: Record<'MA' | 'NH', BBox> = {
  MA: { minLat: 41.237, maxLat: 42.887, minLon: -73.508, maxLon: -69.858 },
  NH: { minLat: 42.697, maxLat: 45.305, minLon: -72.557, maxLon: -70.61 },
};

// Tighter envelope used for the *hard* post-filter (as opposed to the looser
// per-state grid boxes above, which intentionally overlap into neighboring
// states/ocean to keep grid generation simple). A candidate must satisfy both
// the exact-state check AND fall inside this box — either failing means it
// gets dropped. See filterToRegion().
const REGION_ENVELOPE: BBox = { minLat: 42.0, maxLat: 45.4, minLon: -73.5, maxLon: -70.5 };

const ENV_PATH = path.join(__dirname, '.env');
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'venues-preview.json');

const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface GridPoint {
  lat: number;
  lon: number;
  state: 'MA' | 'NH';
}

// Exact shape of a row insertable into public.venues (see supabase/schema.sql
// + supabase/migrations/phase6_user_runs.sql for the venue_type/sports/
// is_blocked/reservation_* columns added after the base schema).
interface VenueRow {
  name: string;
  sport_id: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  // null = could not be determined from the venue name — do not guess, flag
  // for manual review instead. See classifyIndoorFromName().
  is_indoor: boolean | null;
  description: string | null;
  popularity_score: number;
  venue_type: string;
  sports: string[];
  is_blocked: boolean;
  reservation_policy: string | null;
  reservation_url: string | null;
  busy_hours_note: string | null;
  // Provenance for future re-run dedupe by source + external ID instead of
  // fuzzy name/coordinate matching alone. Requires the phase12 migration —
  // see supabase/migrations/phase12_venue_import_source.sql.
  import_source: 'google_places' | 'overpass_osm';
  import_source_id: string;
}

type CandidateStatus = 'new' | 'duplicate_self' | 'duplicate_existing' | 'incomplete';

interface Candidate {
  venue: VenueRow;
  source: 'google' | 'osm';
  sourceId: string;
  status: CandidateStatus;
  duplicateOf?: string; // name/id of the match, for human review
  notes: string[];
}

interface GoogleAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  addressComponents?: GoogleAddressComponent[];
  editorialSummary?: { text?: string };
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
  error?: { message?: string };
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface ExistingVenue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// .env loading — deliberately NOT dotenv, to keep this script dependency-free
// and to make explicit that scripts/.env is the only source read (never the
// app's .env.local).
// ─────────────────────────────────────────────────────────────────────────────

function loadScriptEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(
      `Missing ${ENV_PATH}\n` +
        `Copy scripts/.env.example to scripts/.env and fill in real values.\n` +
        `This script only reads scripts/.env — it never reads the app's .env.local.`
    );
  }
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `${key} is missing or empty in scripts/.env. See scripts/.env.example and scripts/README.md.`
    );
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_MI = 3_958.8;

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  return EARTH_RADIUS_MI * 2 * Math.asin(Math.sqrt(h));
}

function pointState(lat: number, lon: number): 'MA' | 'NH' | null {
  for (const [state, bbox] of Object.entries(STATE_BBOXES) as ['MA' | 'NH', BBox][]) {
    if (lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon) {
      return state;
    }
  }
  return null;
}

// Generates grid points ~spacingMiles apart covering bbox, using a per-row
// longitude step corrected for latitude (degrees-per-mile shrinks toward the
// poles). 1 degree latitude ≈ 69 miles everywhere; 1 degree longitude ≈
// 69 * cos(latitude) miles.
function generateGrid(bbox: BBox, state: 'MA' | 'NH', spacingMiles: number): GridPoint[] {
  const points: GridPoint[] = [];
  const dLat = spacingMiles / 69.0;
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += dLat) {
    const dLon = spacingMiles / (69.172 * Math.cos((lat * Math.PI) / 180));
    for (let lon = bbox.minLon; lon <= bbox.maxLon; lon += dLon) {
      points.push({ lat, lon, state });
    }
  }
  return points;
}

function buildGrid(): GridPoint[] {
  const ma = generateGrid(STATE_BBOXES.MA, 'MA', GRID_SPACING_MILES);
  const nh = generateGrid(STATE_BBOXES.NH, 'NH', GRID_SPACING_MILES);
  // Dedupe points that land in both boxes' overlap region.
  const seen = new Set<string>();
  const merged: GridPoint[] = [];
  for (const p of [...ma, ...nh]) {
    const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }
  return merged;
}

function combinedEnvelope(): BBox {
  return {
    minLat: Math.min(STATE_BBOXES.MA.minLat, STATE_BBOXES.NH.minLat),
    maxLat: Math.max(STATE_BBOXES.MA.maxLat, STATE_BBOXES.NH.maxLat),
    minLon: Math.min(STATE_BBOXES.MA.minLon, STATE_BBOXES.NH.minLon),
    maxLon: Math.max(STATE_BBOXES.MA.maxLon, STATE_BBOXES.NH.maxLon),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// is_indoor classification — name-based only. Place "type"/OSM tags proved
// unreliable (e.g. Google's "gym" type covers plain fitness gyms with no
// volleyball courts), so we key off keywords in the venue name and leave it
// null when nothing hits rather than guessing.
// ─────────────────────────────────────────────────────────────────────────────

// Hard overrides always win, regardless of anything else in the name —
// these are unambiguous signals no other keyword should be able to beat.
const HARD_OUTDOOR_KEYWORDS = ['beach', 'outdoor', 'sand'];

// "ymca" is a top-priority indoor override: it beats generic outdoor words
// (park, field, court) but loses to the hard outdoor keywords above (a
// "YMCA Beach Volleyball" would still be outdoor).
const YMCA_KEYWORD = 'ymca';

const OUTDOOR_NAME_KEYWORDS = ['outdoor', 'beach', 'park', 'field', 'court'];
const INDOOR_NAME_KEYWORDS = [
  'indoor',
  'gym',
  'arena',
  'center',
  'centre',
  'ymca',
  'fieldhouse',
  'field house',
  'sportsplex',
  'sports plex',
  'gymnasium',
  'rec center',
  'recreation center',
  'community center',
  'athletic center',
  'sports center',
];

// Priority order:
//   1. Hard outdoor keywords (beach/outdoor/sand) — always win.
//   2. "ymca" — beats generic outdoor words (park/field/court) but not tier 1.
//   3. Longest-keyword-wins between the remaining outdoor/indoor lists. Some
//      indoor phrases ("fieldhouse", "field house") contain a shorter
//      outdoor keyword ("field"); picking the longest match lets the more
//      specific phrase win (e.g. "Leverone Field House" → indoor).
function classifyIndoorFromName(name: string): { isIndoor: boolean | null; note: string | null } {
  const lower = name.toLowerCase();

  if (HARD_OUTDOOR_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { isIndoor: false, note: null };
  }
  if (lower.includes(YMCA_KEYWORD)) {
    return { isIndoor: true, note: null };
  }

  const remainingOutdoor = OUTDOOR_NAME_KEYWORDS.filter((kw) => !HARD_OUTDOOR_KEYWORDS.includes(kw));
  const remainingIndoor = INDOOR_NAME_KEYWORDS.filter((kw) => kw !== YMCA_KEYWORD);
  const longestMatchLength = (keywords: string[]) =>
    keywords.reduce((max, kw) => (lower.includes(kw) && kw.length > max ? kw.length : max), 0);

  const outdoorLen = longestMatchLength(remainingOutdoor);
  const indoorLen = longestMatchLength(remainingIndoor);

  if (outdoorLen === 0 && indoorLen === 0) {
    return { isIndoor: null, note: 'is_indoor unverified' };
  }
  return { isIndoor: indoorLen > outdoorLen, note: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Places (New) Text Search
// ─────────────────────────────────────────────────────────────────────────────

async function searchGooglePlaces(
  apiKey: string,
  grid: GridPoint[]
): Promise<{ places: GooglePlace[]; callCount: number; capHit: boolean }> {
  const results: GooglePlace[] = [];
  let callCount = 0;
  let capHit = false;

  const plannedCalls = grid.length * GOOGLE_QUERY_VARIANTS.length;
  console.log(
    `\n[Google Places] Planned calls: ${grid.length} grid points × ${GOOGLE_QUERY_VARIANTS.length} ` +
      `variant(s) = ${plannedCalls} (hard cap ${GOOGLE_CALL_HARD_CAP})`
  );
  if (plannedCalls > GOOGLE_CALL_HARD_CAP) {
    console.warn(
      `[Google Places] WARNING: planned call count exceeds the hard cap. ` +
        `The run will stop early and NH/MA coverage will be incomplete. ` +
        `Reduce GOOGLE_QUERY_VARIANTS, increase GRID_SPACING_MILES, or run states separately.`
    );
  }

  outer: for (const point of grid) {
    for (const query of GOOGLE_QUERY_VARIANTS) {
      if (callCount >= GOOGLE_CALL_HARD_CAP) {
        capHit = true;
        console.warn(
          `\n[Google Places] HARD CAP REACHED (${GOOGLE_CALL_HARD_CAP} calls). Stopping further Google Places calls. ` +
            `Overpass and dedupe/write steps will still run on what was collected.`
        );
        break outer;
      }

      callCount++;
      console.log(
        `[Google Places] call #${callCount}/${GOOGLE_CALL_HARD_CAP} — "${query}" @ ` +
          `(${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}) [${point.state}]`
      );

      try {
        const res = await fetch(GOOGLE_PLACES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.addressComponents,places.editorialSummary',
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias: {
              circle: {
                center: { latitude: point.lat, longitude: point.lon },
                radius: GOOGLE_SEARCH_RADIUS_METERS,
              },
            },
            maxResultCount: 20,
          }),
        });

        const body = (await res.json()) as GooglePlacesResponse;

        if (!res.ok) {
          console.warn(
            `[Google Places]   → HTTP ${res.status}: ${body.error?.message ?? 'unknown error'}`
          );
          continue;
        }

        const places = body.places ?? [];
        console.log(`[Google Places]   → ${places.length} result(s)`);
        results.push(...places);
      } catch (err) {
        console.warn(`[Google Places]   → request failed: ${(err as Error).message}`);
      }

      await sleep(GOOGLE_CALL_DELAY_MS);
    }
  }

  return { places: results, callCount, capHit };
}

function addressComponent(place: GooglePlace, type: string): GoogleAddressComponent | undefined {
  return place.addressComponents?.find((c) => c.types?.includes(type));
}

function normalizeGooglePlace(place: GooglePlace): Candidate {
  const notes: string[] = [];
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;

  const cityComponent = addressComponent(place, 'locality');
  const stateComponent = addressComponent(place, 'administrative_area_level_1');
  const cityName = cityComponent?.longText;
  const stateAbbr = stateComponent?.shortText;

  const types = place.types ?? [];
  const { isIndoor, note: indoorNote } = classifyIndoorFromName(name ?? '');
  if (indoorNote) notes.push(indoorNote);

  let venueType = 'park_with_courts';
  if (types.includes('gym') || types.includes('fitness_center')) venueType = 'gym';
  else if (types.includes('school') || types.includes('university')) venueType = 'school_athletics';
  else if (types.includes('stadium')) venueType = 'sports_complex';
  else if (types.includes('park') || types.includes('beach')) venueType = 'park_with_courts';

  const complete = Boolean(name && place.formattedAddress && cityName && stateAbbr && lat && lon);
  if (!name) notes.push('missing name');
  if (!place.formattedAddress) notes.push('missing formatted address');
  if (!cityName) notes.push('missing city (locality address component)');
  if (!stateAbbr) notes.push('missing state (administrative_area_level_1 address component)');

  return {
    source: 'google',
    sourceId: place.id,
    status: complete ? 'new' : 'incomplete',
    notes,
    venue: {
      name: name ?? `Unnamed Google Place (${place.id})`,
      sport_id: 'volleyball',
      address: place.formattedAddress ?? 'Address unavailable — verify before use',
      city: cityName && stateAbbr ? `${cityName}, ${stateAbbr}` : cityName ?? 'Unknown city',
      state: stateAbbr ?? '',
      latitude: lat ?? 0,
      longitude: lon ?? 0,
      image_url: null,
      is_indoor: isIndoor,
      description: place.editorialSummary?.text?.trim() || null,
      popularity_score: 50,
      venue_type: venueType,
      sports: ['volleyball'],
      is_blocked: false,
      reservation_policy: null,
      reservation_url: null,
      busy_hours_note: null,
      import_source: 'google_places',
      import_source_id: place.id,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenStreetMap Overpass API — single bounding-box query for the whole region
// ─────────────────────────────────────────────────────────────────────────────

async function searchOverpass(): Promise<OverpassElement[]> {
  const bbox = combinedEnvelope();
  const query = `
[out:json][timeout:90];
(
  nwr["sport"~"volleyball"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
);
out center tags;
`.trim();

  console.log(`\n[Overpass] 1 bounding-box query covering MA+NH envelope ` +
    `(${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon})`);

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Overpass's Apache front-end returns 406 Not Acceptable for requests
      // with no User-Agent (Node's fetch sends none by default).
      'User-Agent': 'pickup-app-venue-import/1.0 (dry-run script; scripts/import-venues.ts)',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`[Overpass]   → HTTP ${res.status}: ${text.slice(0, 300)}`);
    return [];
  }

  const body = (await res.json()) as OverpassResponse;
  const elements = body.elements ?? [];
  console.log(`[Overpass]   → ${elements.length} element(s)`);
  return elements;
}

function normalizeOverpassElement(el: OverpassElement): Candidate {
  const notes: string[] = [];
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const sourceId = `${el.type}/${el.id}`;

  const name = tags.name?.trim();
  const houseNumber = tags['addr:housenumber'];
  const street = tags['addr:street'];
  const address = tags['addr:full'] ?? (houseNumber && street ? `${houseNumber} ${street}` : undefined);
  const cityName = tags['addr:city'];
  const stateAbbr = tags['addr:state'] ?? (lat != null && lon != null ? pointState(lat, lon) ?? undefined : undefined);

  const { isIndoor, note: indoorNote } = classifyIndoorFromName(name ?? '');
  if (indoorNote) notes.push(indoorNote);

  let venueType = 'park_with_courts';
  if (tags.leisure === 'sports_centre') venueType = 'sports_complex';
  else if (tags.amenity === 'school') venueType = 'school_athletics';
  else if (tags.leisure === 'pitch') venueType = 'park_with_courts';

  const complete = Boolean(name && address && cityName && stateAbbr && lat != null && lon != null);
  if (!name) notes.push('missing name in OSM tags');
  if (!address) notes.push('missing addr:housenumber/addr:street (or addr:full) in OSM tags');
  if (!cityName) notes.push('missing addr:city in OSM tags');
  if (!stateAbbr) notes.push('missing addr:state in OSM tags and point fell outside both state bboxes');

  return {
    source: 'osm',
    sourceId,
    status: complete ? 'new' : 'incomplete',
    notes,
    venue: {
      name: name ?? `Unnamed OSM volleyball location (${sourceId})`,
      sport_id: 'volleyball',
      address: address ?? 'Address unavailable — verify before use',
      city: cityName && stateAbbr ? `${cityName}, ${stateAbbr}` : cityName ?? 'Unknown city',
      state: stateAbbr ?? '',
      latitude: lat ?? 0,
      longitude: lon ?? 0,
      image_url: null,
      is_indoor: isIndoor,
      description: tags.description?.trim() || null,
      popularity_score: 50,
      venue_type: venueType,
      sports: ['volleyball'],
      is_blocked: false,
      reservation_policy: null,
      reservation_url: null,
      busy_hours_note: null,
      import_source: 'overpass_osm',
      import_source_id: sourceId,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dedupe
// ─────────────────────────────────────────────────────────────────────────────

function nameMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return true; // can't compare — fall back to distance-only
  return na.includes(nb) || nb.includes(na);
}

function sameCity(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  const na = norm(a);
  const nb = norm(b);
  return Boolean(na) && na === nb;
}

// Marks later candidates as duplicate_self when either:
//   - they're within DEDUPE_DISTANCE_MILES of an already-accepted candidate
//     with a similar name, or
//   - they're in the same city as an already-accepted candidate with a
//     similar name — some sources (e.g. Overpass) return a park's outer
//     boundary and an individual court/pitch within it as separate elements
//     with matching names but coordinates farther apart than the distance
//     threshold (see "Ellsworth McAfee Park" / "Ellsworth McAfee Park
//     Volleyball Court" in Northborough, MA).
function dedupeSelf(candidates: Candidate[]): Candidate[] {
  const accepted: Candidate[] = [];
  for (const candidate of candidates) {
    const dupe = accepted.find((a) => {
      if (!nameMatches(a.venue.name, candidate.venue.name)) return false;
      const closeByDistance =
        haversineMiles(
          { lat: a.venue.latitude, lon: a.venue.longitude },
          { lat: candidate.venue.latitude, lon: candidate.venue.longitude }
        ) < DEDUPE_DISTANCE_MILES;
      const closeByCity = sameCity(a.venue.city, candidate.venue.city);
      return closeByDistance || closeByCity;
    });
    if (dupe) {
      candidate.status = 'duplicate_self';
      candidate.duplicateOf = `${dupe.source}:${dupe.sourceId} (${dupe.venue.name})`;
      candidate.notes.push(`Duplicate of another candidate found this run: ${candidate.duplicateOf}`);
    }
    accepted.push(candidate);
  }
  return candidates;
}

function dedupeAgainstExisting(candidates: Candidate[], existing: ExistingVenue[]): Candidate[] {
  for (const candidate of candidates) {
    if (candidate.status === 'duplicate_self') continue; // already excluded, no need to re-check
    const dupe = existing.find(
      (e) =>
        haversineMiles(
          { lat: e.latitude, lon: e.longitude },
          { lat: candidate.venue.latitude, lon: candidate.venue.longitude }
        ) < DEDUPE_DISTANCE_MILES && nameMatches(e.name, candidate.venue.name)
    );
    if (dupe) {
      candidate.status = 'duplicate_existing';
      candidate.duplicateOf = `existing venue ${dupe.id} (${dupe.name})`;
      candidate.notes.push(`Matches an existing venues row: ${candidate.duplicateOf}`);
    }
  }
  return candidates;
}

// ─────────────────────────────────────────────────────────────────────────────
// Region hard filter — runs after Google + Overpass results are collected and
// normalized. A candidate must have state exactly "MA" or "NH" AND fall
// inside REGION_ENVELOPE; failing either drops it entirely (not written to
// the preview output). Candidates already flagged 'incomplete' are skipped
// here — their state/coordinates may be missing or defaulted, so running
// them through this check would misreport a missing-field problem as an
// out-of-region drop. See logIncompleteCandidates() for how those surface.
// ─────────────────────────────────────────────────────────────────────────────

function isWithinRegion(candidate: Candidate): boolean {
  const { state, latitude, longitude } = candidate.venue;
  const stateOk = state === 'MA' || state === 'NH';
  const coordsOk =
    latitude >= REGION_ENVELOPE.minLat &&
    latitude <= REGION_ENVELOPE.maxLat &&
    longitude >= REGION_ENVELOPE.minLon &&
    longitude <= REGION_ENVELOPE.maxLon;
  return stateOk && coordsOk;
}

function filterToRegion(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  let dropped = 0;
  for (const candidate of candidates) {
    if (candidate.status === 'incomplete' || isWithinRegion(candidate)) {
      kept.push(candidate);
      continue;
    }
    dropped++;
    console.log(
      `[Region filter] DROPPED ${candidate.source}:${candidate.sourceId} "${candidate.venue.name}" — ` +
        `state="${candidate.venue.state}" lat=${candidate.venue.latitude} lon=${candidate.venue.longitude} ` +
        `(not MA/NH and/or outside the state+bbox envelope)`
    );
  }
  if (dropped > 0) {
    console.log(`[Region filter] Dropped ${dropped} candidate(s) outside the MA/NH region.`);
  }
  return kept;
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimum-quality filter — runs after the region filter, on non-incomplete
// candidates only. Catches low-quality "new" records that technically had
// every required field but aren't usable as a real venue: an address with
// no street number (locality-only match), coordinates that are missing/zero/
// out of bounds (defense in depth — filterToRegion should have already
// caught out-of-bounds), or a name too generic/short to mean anything.
// ─────────────────────────────────────────────────────────────────────────────

const GENERIC_STANDALONE_NAMES = ['park', 'court', 'courts', 'gym', 'field', 'fields', 'arena', 'center', 'centre'];

function hasRealStreetAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed || trimmed === 'Address unavailable — verify before use') return false;
  // Crude but effective heuristic: a real street address has a house/building
  // or route number in it; a locality-only result ("Boston, MA, USA") doesn't.
  return /\d/.test(trimmed);
}

function hasValidCoordinates(venue: VenueRow): boolean {
  const { latitude, longitude } = venue;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return (
    latitude >= REGION_ENVELOPE.minLat &&
    latitude <= REGION_ENVELOPE.maxLat &&
    longitude >= REGION_ENVELOPE.minLon &&
    longitude <= REGION_ENVELOPE.maxLon
  );
}

function isGenericStandaloneName(name: string): boolean {
  const trimmed = name.trim().toLowerCase();
  return trimmed.length < 4 || GENERIC_STANDALONE_NAMES.includes(trimmed);
}

function filterQuality(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  let dropped = 0;
  for (const candidate of candidates) {
    if (candidate.status === 'incomplete') {
      kept.push(candidate);
      continue;
    }
    const reasons: string[] = [];
    if (!hasRealStreetAddress(candidate.venue.address)) reasons.push('no real street address');
    if (!hasValidCoordinates(candidate.venue)) reasons.push('missing/zero/out-of-bounds coordinates');
    if (isGenericStandaloneName(candidate.venue.name)) reasons.push('name too short or a generic standalone word');

    if (reasons.length > 0) {
      dropped++;
      console.log(
        `[Quality filter] DROPPED ${candidate.source}:${candidate.sourceId} "${candidate.venue.name}" — ${reasons.join('; ')}`
      );
      continue;
    }
    kept.push(candidate);
  }
  if (dropped > 0) {
    console.log(`[Quality filter] Dropped ${dropped} candidate(s) failing minimum-quality checks.`);
  }
  return kept;
}

// ─────────────────────────────────────────────────────────────────────────────
// Junk-name filter — drops candidates whose name matches known non-venue
// noise: franchise retailers, resale shops, wrong-sport facilities, and
// vacation-rental/campground listings (Google/OSM occasionally surface
// Airbnb-style listings that happen to mention "volleyball" in their
// description). Applied to every candidate regardless of completeness —
// a junk record is junk whether or not it's missing fields.
// ─────────────────────────────────────────────────────────────────────────────

const JUNK_NAME_KEYWORDS = [
  "dick's sporting goods",
  'walmart',
  'play it again sports',
  'zero gravity basketball',
  'play practice basketball',
  'rowing boathouse',
  'the track at new balance',
  'koa holiday',
  'campground',
  'cabin',
  'yurt',
  'retreat',
  'airbnb',
  'vrbo',
  'vacation rental',
  'overnight camp',
  'volleyball camp',
  'volleyball clinic',
  'jumbo volleyball',
  'get better volleyball',
];

// Full-name-only matches (not substrings elsewhere in a longer name).
const JUNK_EXACT_NAMES = [
  'volleyball',
  'volleyball court',
  'volleyball courts',
  'dallinscrib',
  'recreation center',
];

// "X Volleyball Club" is usually a program/team, not a physical venue —
// unless the name also names an actual facility (e.g. "... Volleyball Club
// Sports Complex" is a place you can go; "AVA Volleyball Club" isn't).
const VOLLEYBALL_CLUB_FACILITY_EXCEPTIONS = [
  'center',
  'complex',
  'gym',
  'court',
  'arena',
  'sportsplex',
  'facility',
];

function isJunkName(name: string): boolean {
  const lower = name.toLowerCase().trim();

  if (JUNK_EXACT_NAMES.includes(lower)) return true;
  if (JUNK_NAME_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  if (
    lower.includes('volleyball club') &&
    !VOLLEYBALL_CLUB_FACILITY_EXCEPTIONS.some((kw) => lower.includes(kw))
  ) {
    return true;
  }
  return false;
}

function filterJunk(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  let dropped = 0;
  for (const candidate of candidates) {
    if (isJunkName(candidate.venue.name)) {
      dropped++;
      console.log(
        `[Junk filter] DROPPED ${candidate.source}:${candidate.sourceId} "${candidate.venue.name}"`
      );
      continue;
    }
    kept.push(candidate);
  }
  if (dropped > 0) {
    console.log(`[Junk filter] Dropped ${dropped} candidate(s) matching junk name keywords.`);
  }
  return kept;
}

// ─────────────────────────────────────────────────────────────────────────────
// Incomplete-record logging — surfaces exactly which field(s) each dropped-
// from-consideration record is missing, instead of letting it disappear
// silently. These stay in the preview output (status 'incomplete') for human
// review; they are never inserted regardless of --apply.
// ─────────────────────────────────────────────────────────────────────────────

function logIncompleteCandidates(candidates: Candidate[]): void {
  const incomplete = candidates.filter((c) => c.status === 'incomplete');
  if (incomplete.length === 0) return;
  console.log(
    `\n[Incomplete] ${incomplete.length} candidate(s) missing required field(s) — kept in ` +
      `${path.basename(OUTPUT_PATH)} for review, excluded from insertion:`
  );
  for (const candidate of incomplete) {
    console.log(
      `  ${candidate.source}:${candidate.sourceId} "${candidate.venue.name}" — ${candidate.notes.join('; ')}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Insert-time is_indoor coercion — public.venues.is_indoor is NOT NULL, so a
// candidate with is_indoor: null (unverified) can't be inserted as-is. The
// preview JSON keeps the true null for human review; only at --apply time do
// we default it to false and prepend a visible flag to the description so
// the ambiguity isn't silently lost (see conversation: allowing NULL in the
// DB would require row.is_indoor ? 'indoor' : 'outdoor' in
// src/lib/queries/venues.ts to also change, which is out of scope here).
// ─────────────────────────────────────────────────────────────────────────────

const UNVERIFIED_INDOOR_FLAG = '⚠ is_indoor unverified — needs manual review. ';

function toInsertableVenue(venue: VenueRow): VenueRow & { is_indoor: boolean } {
  if (venue.is_indoor !== null) {
    return { ...venue, is_indoor: venue.is_indoor };
  }
  const base = venue.description ?? '';
  // Idempotency guard: if this venue object somehow already carries the flag
  // (e.g. re-run against already-flagged data), don't prepend it twice.
  const description = base.startsWith(UNVERIFIED_INDOOR_FLAG) ? base : `${UNVERIFIED_INDOOR_FLAG}${base}`.trim();
  return { ...venue, is_indoor: false, description };
}

// ─────────────────────────────────────────────────────────────────────────────
// Final QA report — diagnostic only, does not change candidate status. Runs
// against the final "new" list after all filtering/dedupe and prints
// anomalies a human should look at before --apply:
//   - exact-name duplicates within the same city (dedupeSelf should already
//     prevent these; this is a safety-net re-check)
//   - a name that's a substring of another name anywhere in the region
//     (possible same-org-different-location OR an undetected duplicate —
//     flagged for human judgment either way)
//   - duplicate lat/lon pairs (would indicate a geocoding/data error)
//   - zero/non-finite coordinates or a state that doesn't match its point
//     (both should be impossible post-filtering; reported if they occur)
// ─────────────────────────────────────────────────────────────────────────────

function runFinalQaChecks(candidates: Candidate[]): void {
  const newCandidates = candidates.filter((c) => c.status === 'new');
  console.log(`\n[QA] Running final checks on ${newCandidates.length} "new" candidate(s)...`);

  let issues = 0;

  // Exact-name duplicates within the same city.
  const byCityAndName = new Map<string, Candidate[]>();
  for (const c of newCandidates) {
    const key = `${c.venue.city.trim().toLowerCase()}|${c.venue.name.trim().toLowerCase()}`;
    const group = byCityAndName.get(key) ?? [];
    group.push(c);
    byCityAndName.set(key, group);
  }
  for (const group of byCityAndName.values()) {
    if (group.length > 1) {
      issues++;
      console.log(
        `[QA] EXACT-NAME DUPLICATE within same city: "${group[0].venue.name}" in ${group[0].venue.city} ` +
          `appears ${group.length}x — ${group.map((c) => `${c.source}:${c.sourceId}`).join(', ')}`
      );
    }
  }

  // Substring-name matches (possible same-org/different-location, or a
  // duplicate that slipped past dedupeSelf) — reported for human review.
  for (let i = 0; i < newCandidates.length; i++) {
    for (let j = i + 1; j < newCandidates.length; j++) {
      const a = newCandidates[i];
      const b = newCandidates[j];
      if (a.venue.city.trim().toLowerCase() === b.venue.city.trim().toLowerCase()) continue; // already caught above
      if (nameMatches(a.venue.name, b.venue.name)) {
        issues++;
        console.log(
          `[QA] CROSS-CITY NAME MATCH — "${a.venue.name}" (${a.venue.city}) vs "${b.venue.name}" ` +
            `(${b.venue.city}): same org at two locations, or an undetected duplicate — verify manually.`
        );
      }
    }
  }

  // Duplicate coordinates.
  const byCoords = new Map<string, Candidate[]>();
  for (const c of newCandidates) {
    const key = `${c.venue.latitude},${c.venue.longitude}`;
    const group = byCoords.get(key) ?? [];
    group.push(c);
    byCoords.set(key, group);
  }
  for (const group of byCoords.values()) {
    if (group.length > 1) {
      issues++;
      console.log(
        `[QA] DUPLICATE COORDINATES (${group[0].venue.latitude}, ${group[0].venue.longitude}) shared by ` +
          group.map((c) => `"${c.venue.name}" (${c.source}:${c.sourceId})`).join(' AND ')
      );
    }
  }

  // Zero/invalid coordinates or state/point mismatch — should be impossible
  // after filterToRegion + filterQuality; reported if it ever happens.
  for (const c of newCandidates) {
    const { latitude, longitude, state } = c.venue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      issues++;
      console.log(`[QA] INVALID COORDINATES on "${c.venue.name}" (${c.source}:${c.sourceId}): (${latitude}, ${longitude})`);
      continue;
    }
    const actualState = pointState(latitude, longitude);
    if (actualState !== state) {
      issues++;
      console.log(
        `[QA] STATE/COORDINATE MISMATCH on "${c.venue.name}" (${c.source}:${c.sourceId}): ` +
          `labeled state="${state}" but point falls in ${actualState ?? 'neither MA nor NH'}`
      );
    }
  }

  if (issues === 0) {
    console.log('[QA] No issues found: zero exact-name duplicates within a city, zero coordinate duplicates, all coordinates valid and state-consistent.');
  } else {
    console.log(`[QA] ${issues} issue(s) flagged above for manual review.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes('--apply');

  const env = loadScriptEnv();
  const googleApiKey = requireEnv(env, 'GOOGLE_PLACES_API_KEY');
  const supabaseUrl = requireEnv(env, 'SUPABASE_URL');
  const supabaseServiceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const grid = buildGrid();
  console.log(`Grid: ${grid.length} points, ${GRID_SPACING_MILES}mi spacing, MA + NH`);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // ── Collect ──────────────────────────────────────────────────────────────
  const { places, callCount, capHit } = await searchGooglePlaces(googleApiKey, grid);
  const overpassElements = await searchOverpass();

  const googleCandidates = places.map(normalizeGooglePlace);
  const osmCandidates = overpassElements.map(normalizeOverpassElement);
  let candidates = [...googleCandidates, ...osmCandidates];

  // ── Junk-name filter ─────────────────────────────────────────────────────
  candidates = filterJunk(candidates);

  // ── Incomplete-record visibility (before any filtering removes context) ──
  logIncompleteCandidates(candidates);

  // ── Hard region filter ──────────────────────────────────────────────────
  candidates = filterToRegion(candidates);

  // ── Minimum-quality filter ──────────────────────────────────────────────
  candidates = filterQuality(candidates);

  // ── Dedupe ───────────────────────────────────────────────────────────────
  candidates = dedupeSelf(candidates);

  console.log('\nFetching existing venues from Supabase for dedupe...');
  const { data: existingRows, error: existingError } = await supabase
    .from('venues')
    .select('id, name, latitude, longitude');
  if (existingError) {
    throw new Error(`Failed to fetch existing venues: ${existingError.message}`);
  }
  const existing = (existingRows ?? []) as ExistingVenue[];
  console.log(`Found ${existing.length} existing venue(s) in Supabase.`);

  candidates = dedupeAgainstExisting(candidates, existing);

  // ── Final QA report (diagnostic only) ───────────────────────────────────
  runFinalQaChecks(candidates);

  // ── Summarize ────────────────────────────────────────────────────────────
  const counts = {
    total: candidates.length,
    new: candidates.filter((c) => c.status === 'new').length,
    duplicate_self: candidates.filter((c) => c.status === 'duplicate_self').length,
    duplicate_existing: candidates.filter((c) => c.status === 'duplicate_existing').length,
    incomplete: candidates.filter((c) => c.status === 'incomplete').length,
  };

  const preview = {
    generatedAt: new Date().toISOString(),
    region: 'Massachusetts + New Hampshire',
    sport: 'volleyball',
    grid: { spacingMiles: GRID_SPACING_MILES, pointCount: grid.length },
    google: { callCount, callLimit: GOOGLE_CALL_HARD_CAP, capHit, rawResultCount: places.length },
    overpass: { rawResultCount: overpassElements.length },
    existingVenueCount: existing.length,
    counts,
    candidates,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(preview, null, 2), 'utf8');
  console.log(`\nWrote ${candidates.length} candidate(s) to ${OUTPUT_PATH}`);
  console.log(
    `  new: ${counts.new}  duplicate_self: ${counts.duplicate_self}  ` +
      `duplicate_existing: ${counts.duplicate_existing}  incomplete: ${counts.incomplete}`
  );
  if (capHit) {
    console.warn(
      `\nWARNING: Google Places hard cap (${GOOGLE_CALL_HARD_CAP}) was reached — this run did not cover the full grid.`
    );
  }

  if (!apply) {
    console.log(`\nDRY RUN — no database writes. Re-run with --apply to insert ${counts.new} new venue(s).`);
    return;
  }

  const insertable = candidates.filter((c) => c.status === 'new').map((c) => toInsertableVenue(c.venue));
  if (insertable.length === 0) {
    console.log('\n--apply set, but there are no candidates with status "new" to insert.');
    return;
  }

  console.log(`\n--apply set. Inserting ${insertable.length} new venue(s) into Supabase...`);
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < insertable.length; i += BATCH_SIZE) {
    const batch = insertable.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('venues').insert(batch);
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed: ${error.message}`);
      continue;
    }
    inserted += batch.length;
    console.log(`  inserted batch ${i / BATCH_SIZE + 1}: ${batch.length} row(s)`);
  }
  console.log(`\nDone. Inserted ${inserted}/${insertable.length} venue(s).`);
}

main().catch((err) => {
  console.error(`\nFatal error: ${(err as Error).message}`);
  process.exit(1);
});
