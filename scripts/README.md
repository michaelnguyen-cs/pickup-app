# scripts/

Standalone Node/TypeScript tooling for Pick-Up. Not part of the Expo app —
nothing here is bundled or imported by app source. Run these scripts directly
with Node, outside of `expo start`.

## import-venues.ts

Imports volleyball venues for Massachusetts and New Hampshire from Google
Places API (New) and OpenStreetMap Overpass API, normalizes them to the
`public.venues` schema, dedupes against each other and against the live
Supabase `venues` table, and writes a review file. It never writes to the
database unless you pass `--apply`.

### Setup

1. Install a TypeScript runner if you don't already have one available:
   ```
   npx tsx --version
   ```
   `npx` will fetch `tsx` on first use — no need to add it to the app's
   `package.json`.

2. Copy the env template and fill in real values:
   ```
   cp scripts/.env.example scripts/.env
   ```
   `scripts/.env` is gitignored (see repo root `.gitignore`) — it will never
   be committed. This script reads credentials **only** from `scripts/.env`.
   It never reads the app's `.env.local`, even though some values (like the
   Supabase URL) overlap — this keeps the import tool fully independent of
   the app's runtime config.

   Required variables (see `scripts/.env.example` for details):
   - `GOOGLE_PLACES_API_KEY` — a Google Cloud API key with **Places API
     (New)** enabled.
   - `SUPABASE_URL` — same project as the app, e.g.
     `https://zomexixajmhviibzhrum.supabase.co`.
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project
     Settings → API. Required because `public.venues` has no INSERT policy
     for `anon`/`authenticated`; only the service role can write to it (and
     is used here for reads too, to bypass RLS reliably for dedupe). Treat
     it like a root password.

### Running

Dry run (default — no database writes):
```
npx tsx scripts/import-venues.ts
```
This writes every candidate venue — new, duplicate, or incomplete — to
`scripts/output/venues-preview.json` (gitignored) along with a summary of
counts and every Google Places / Overpass call made. Read the preview file
before ever running with `--apply`.

Apply (inserts only candidates with `status: "new"`):
```
npx tsx scripts/import-venues.ts --apply
```

### What it does

- **Grid search (Google Places):** tiles MA + NH bounding boxes with points
  spaced ~15 miles apart and issues one Places Text Search call per point
  (query: `"volleyball"`, biased to that point). This is a paid, metered API
  — the script **hard-stops at 200 calls per run**, logging every call as it
  happens (`[Google Places] call #N/200 — ...`) and printing a clear warning
  if the cap is hit before the grid finishes. If you see that warning,
  coverage was incomplete for that run.
- **Overpass (OpenStreetMap):** issues a single bounding-box query covering
  the same MA+NH region for elements tagged `sport~volleyball` — no grid
  needed here since Overpass has no per-call radius/result cap.
- **Dedupe:** candidates within ~0.1 miles of each other (or of an existing
  `venues` row) with a matching name are marked `duplicate_self` /
  `duplicate_existing` and excluded from `--apply`. Candidates missing a
  required field (name, address, city, or state) are marked `incomplete` and
  also excluded — nothing with a placeholder address gets inserted
  automatically.
- **Schema match:** output rows match `public.venues` exactly, including the
  columns added in `supabase/migrations/phase6_user_runs.sql`
  (`venue_type`, `sports`, `is_blocked`, `reservation_*`). `city` is written
  as `"City, ST"` and `state` as the bare abbreviation, matching the
  existing seed data convention (see `supabase/seed.sql` and how
  `VenueDetailScreen.tsx` renders `${venue.address}, ${venue.city}`).

### Adjusting the search

Constants near the top of `import-venues.ts`:
- `GRID_SPACING_MILES` (default 15)
- `GOOGLE_QUERY_VARIANTS` (default `['volleyball']`) — adding more terms
  multiplies the call count (`grid points × variants`); the script prints
  the planned call count before it starts and warns if it exceeds the cap.
- `GOOGLE_CALL_HARD_CAP` (default 200)
- `DEDUPE_DISTANCE_MILES` (default 0.1)

### Output

`scripts/output/venues-preview.json` (gitignored) — an object with:
- `grid`, `google`, `overpass` — run metadata (points searched, calls made,
  whether the cap was hit)
- `counts` — `new` / `duplicate_self` / `duplicate_existing` / `incomplete`
- `candidates` — every candidate found, each with the exact `venue` row
  shape that would be inserted, its `source` (`google`/`osm`), `status`, and
  human-readable `notes` explaining any uncertainty (e.g. "is_indoor could
  not be determined... defaulted to false, verify manually").

Review this file before running `--apply`. It is the only artifact you
should need to sanity-check a run.
