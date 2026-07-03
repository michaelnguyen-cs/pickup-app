-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 7: AI-ASSISTED INGESTION FOUNDATION
--
-- Run this in the Supabase SQL Editor AFTER the baseline schema.sql.
-- It is safe to re-run (all DDL uses IF NOT EXISTS / IF EXISTS guards).
--
-- Two changes:
--   1. Extend the live `runs` table with provenance and verification columns
--   2. Create `run_candidates` — a staging table for AI-extracted entries
--
-- Nothing in this migration changes the app UI or existing RLS policies.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND `runs` WITH PROVENANCE AND VERIFICATION COLUMNS
--
-- All new columns are nullable (or have safe defaults) so existing rows are
-- unaffected. `source_type` defaults to 'manual' to accurately describe
-- current data entered by admins.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS source_url          text,
  ADD COLUMN IF NOT EXISTS source_type         text NOT NULL DEFAULT 'manual'
                             CHECK (source_type IN ('manual', 'admin', 'ai_extracted', 'ai_assisted')),
  ADD COLUMN IF NOT EXISTS confidence_score    numeric(3,2)
                             CHECK (confidence_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS last_verified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method text
                             CHECK (verification_method IN ('admin_review', 'crowd_report', 'auto_rescrape', 'user_submission'));

COMMENT ON COLUMN public.runs.source_url
  IS 'URL of the source page or file this run was ingested from. NULL for manually entered runs.';

COMMENT ON COLUMN public.runs.source_type
  IS 'How this run entered the database. manual = admin-entered directly. ai_extracted = fully AI-derived. ai_assisted = human edited an AI draft.';

COMMENT ON COLUMN public.runs.confidence_score
  IS '0.00–1.00. AI confidence in this entry at time of ingestion. NULL means manually verified (treat as 1.0).';

COMMENT ON COLUMN public.runs.last_verified_at
  IS 'Timestamp of the most recent confirmation that this run is still accurate. NULL = never explicitly verified. Used for freshness badges.';

COMMENT ON COLUMN public.runs.verification_method
  IS 'How the most recent verification was performed. Drives trust signals in the UI.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `run_candidates` — STAGING TABLE FOR AI-EXTRACTED SCHEDULE ENTRIES
--
-- AI pipeline output lands here. A human reviewer (or future automated
-- promotion logic) inspects, corrects, and approves entries into the live
-- `runs` table. Entries in this table are never shown to app users.
--
-- Design goals:
--   - Preserve the raw AI output alongside the structured extraction so
--     nothing is lost if field mapping was wrong.
--   - Support the full review lifecycle: pending → approved/rejected.
--   - Link approved candidates back to their promoted run for traceability.
--   - Track staleness: `last_seen_at` updates on every scrape cycle, so
--     entries not seen recently may indicate a schedule that was removed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.run_candidates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Schedule fields — mirror runs exactly for a clean promotion path ─────────
  -- venue_id is nullable: the AI may identify a run without being able to
  -- match it to an existing venue row. The candidate is preserved either way.
  venue_id         uuid        REFERENCES public.venues(id) ON DELETE SET NULL,
  title            text        NOT NULL,
  sport_id         text        NOT NULL,
  day_of_week      text        NOT NULL
                               CHECK (day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
  start_time       text        NOT NULL,   -- 'HH:MM' 24h, e.g. '18:00'
  end_time         text        NOT NULL,   -- 'HH:MM' 24h, e.g. '21:00'
  skill_level      text        NOT NULL DEFAULT 'casual'
                               CHECK (skill_level IN ('beginner','casual','intermediate','competitive','mixed')),
  is_indoor        boolean     NOT NULL DEFAULT false,
  notes            text,

  -- ── Provenance ───────────────────────────────────────────────────────────────
  source_url       text,
  source_name      text,       -- human-readable label, e.g. "LA Fitness Woodland Hills"
  source_type      text        NOT NULL DEFAULT 'website'
                               CHECK (source_type IN ('website','pdf','image','social_post','manual')),
  raw_text         text,       -- verbatim text chunk fed to the model (audit trail)
  extracted_json   jsonb,      -- raw structured output before field mapping (preserves ambiguity)

  -- ── Confidence and review ─────────────────────────────────────────────────────
  confidence_score numeric(3,2) NOT NULL DEFAULT 0.50
                               CHECK (confidence_score BETWEEN 0 AND 1),
  -- Automatically set true when confidence < pipeline threshold.
  -- Can also be set true by the reviewer to flag an entry for a second pass.
  needs_review     boolean     NOT NULL DEFAULT true,
  review_status    text        NOT NULL DEFAULT 'pending'
                               CHECK (review_status IN ('pending','approved','rejected','needs_clarification')),
  reviewed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,

  -- ── Timing ───────────────────────────────────────────────────────────────────
  -- last_seen_at is updated by the scrape pipeline each time this exact entry
  -- is found. If it stops appearing, the entry may have been removed from the
  -- source — a freshness signal even before human review.
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,

  -- ── Promotion link ────────────────────────────────────────────────────────────
  -- Set when this candidate is approved and promoted to a live run.
  -- Enables full provenance tracing: run → candidate → source page.
  approved_run_id  uuid        REFERENCES public.runs(id) ON DELETE SET NULL,

  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.run_candidates
  IS 'Staging table for AI-extracted recurring game entries. Reviewed before promotion to runs.';

COMMENT ON COLUMN public.run_candidates.venue_id
  IS 'Nullable. The AI may identify a schedule entry without matching it to an existing venue row.';

COMMENT ON COLUMN public.run_candidates.raw_text
  IS 'Verbatim text chunk fed to the model. Stored for re-extraction and audit. Never shown to users.';

COMMENT ON COLUMN public.run_candidates.extracted_json
  IS 'Raw AI output before field mapping. Preserves ambiguity — useful if the mapping logic changes.';

COMMENT ON COLUMN public.run_candidates.confidence_score
  IS '0.00–1.00. AI self-reported confidence. Below the pipeline threshold → needs_review is set true.';

COMMENT ON COLUMN public.run_candidates.needs_review
  IS 'True when human attention is required. Low confidence sets this automatically. Reviewers can also set it manually.';

COMMENT ON COLUMN public.run_candidates.last_seen_at
  IS 'Updated each scrape cycle when this entry is still present in the source. Staleness = now() - last_seen_at.';

COMMENT ON COLUMN public.run_candidates.approved_run_id
  IS 'FK to runs.id. Set on approval. Provides end-to-end traceability from source page to live run.';


-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Most common admin query: pending candidates needing review
CREATE INDEX IF NOT EXISTS idx_run_candidates_pending
  ON public.run_candidates(review_status)
  WHERE review_status = 'pending';

-- Filter by venue during review / promotion
CREATE INDEX IF NOT EXISTS idx_run_candidates_venue
  ON public.run_candidates(venue_id)
  WHERE venue_id IS NOT NULL;

-- Pipeline staleness queries (find entries not seen recently)
CREATE INDEX IF NOT EXISTS idx_run_candidates_last_seen
  ON public.run_candidates(last_seen_at);

-- Source dedup: prevents re-inserting the same slot from the same URL.
-- Pipeline should upsert on this conflict to update last_seen_at.
-- Partial: only enforced for non-rejected, URL-bearing candidates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_run_candidates_dedup
  ON public.run_candidates(source_url, day_of_week, start_time, end_time)
  WHERE review_status != 'rejected'
    AND source_url IS NOT NULL;

-- Traceability: find the candidate that produced a given live run
CREATE INDEX IF NOT EXISTS idx_run_candidates_approved_run
  ON public.run_candidates(approved_run_id)
  WHERE approved_run_id IS NOT NULL;


-- ── Row Level Security ────────────────────────────────────────────────────────
-- RLS is enabled with NO user-facing policies.
-- Only the service role (AI pipeline, admin scripts) can read or write.
-- A future admin review UI will add SELECT/UPDATE policies scoped to an
-- is_admin flag on profiles, added when the UI is built.

ALTER TABLE public.run_candidates ENABLE ROW LEVEL SECURITY;
