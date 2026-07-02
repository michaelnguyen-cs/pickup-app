-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 14: venue import source tracking
--
-- Adds provenance columns to `venues` so scripts/import-venues.ts can dedupe
-- against already-imported rows on future re-runs by source + external ID,
-- instead of relying solely on fuzzy name/coordinate matching (which missed
-- cases like the "Ellsworth McAfee Park" / "...Volleyball Court" duplicate
-- during manual review of the Phase 14 import).
--
-- Both columns are nullable: existing seed/manually-created venues have
-- neither and stay that way. Safe to re-run (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS import_source    text CHECK (import_source IN ('google_places', 'overpass_osm')),
  ADD COLUMN IF NOT EXISTS import_source_id text;

COMMENT ON COLUMN public.venues.import_source    IS 'Where this row was imported from, if any. Null for manually-created/seed venues.';
COMMENT ON COLUMN public.venues.import_source_id IS 'Google place_id or OSM "type/id" (e.g. "way/123456") for the source record. Null for manually-created/seed venues.';

-- Speeds up future re-run dedupe lookups (source, source_id) -> existing row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_import_source
  ON public.venues(import_source, import_source_id)
  WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL;
