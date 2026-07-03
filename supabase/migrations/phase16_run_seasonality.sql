-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 16: run seasonality
--
-- Many recurring runs (esp. outdoor sand volleyball, seasonal indoor
-- facilities) don't operate year-round. Without this, a run imported from
-- research showing "closed June-August" would display as always-on. Adds
-- the same seasonality columns to both `runs` (live) and `run_candidates`
-- (staging) so seasonality survives promotion from candidate to run.
--
-- season_start_month/season_end_month intentionally allow start > end
-- (e.g. 11 through 4 for a facility open Nov-April, wrapping across the
-- new year) — no CHECK enforces start <= end.
--
-- Safe to re-run (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS season_start_month integer CHECK (season_start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS season_end_month integer CHECK (season_end_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS is_seasonal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_notes text;

ALTER TABLE public.run_candidates
  ADD COLUMN IF NOT EXISTS season_start_month integer CHECK (season_start_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS season_end_month integer CHECK (season_end_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS is_seasonal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_notes text;

COMMENT ON COLUMN public.runs.is_seasonal IS 'True if this run does not operate year-round.';
COMMENT ON COLUMN public.runs.season_start_month IS '1-12. Month the season starts. Null if not seasonal or unknown.';
COMMENT ON COLUMN public.runs.season_end_month IS '1-12. Month the season ends. Null if not seasonal or unknown. Can be less than season_start_month (season wraps the new year).';
COMMENT ON COLUMN public.runs.season_notes IS 'Free-text seasonality detail, e.g. "Dormant June-August".';

COMMENT ON COLUMN public.run_candidates.is_seasonal IS 'True if this run does not operate year-round.';
COMMENT ON COLUMN public.run_candidates.season_start_month IS '1-12. Month the season starts. Null if not seasonal or unknown.';
COMMENT ON COLUMN public.run_candidates.season_end_month IS '1-12. Month the season ends. Null if not seasonal or unknown. Can be less than season_start_month (season wraps the new year).';
COMMENT ON COLUMN public.run_candidates.season_notes IS 'Free-text seasonality detail, e.g. "Dormant June-August".';
