-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 15: run_candidates — allow unconfirmed schedules
--
-- day_of_week / start_time / end_time were NOT NULL, which assumed every
-- candidate has a confirmed recurring slot. In practice, manual research
-- (e.g. a venue confirmed to run pickup volleyball, but with no published
-- day/time) needs to land in this staging table too, flagged via
-- needs_review, rather than being silently dropped or given a fabricated
-- schedule to satisfy the constraint.
--
-- The day_of_week CHECK constraint is unaffected: Postgres CHECK constraints
-- already permit NULL (evaluates to unknown, not a violation), so dropping
-- NOT NULL is sufficient — no need to touch the CHECK.
--
-- Safe to re-run (DROP NOT NULL is idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.run_candidates
  ALTER COLUMN day_of_week DROP NOT NULL,
  ALTER COLUMN start_time  DROP NOT NULL,
  ALTER COLUMN end_time    DROP NOT NULL;

COMMENT ON COLUMN public.run_candidates.day_of_week IS 'Null when research could not confirm a recurring day. See needs_review.';
COMMENT ON COLUMN public.run_candidates.start_time  IS 'Null when research could not confirm a start time. ''HH:MM'' 24h when known.';
COMMENT ON COLUMN public.run_candidates.end_time    IS 'Null when research could not confirm an end time. ''HH:MM'' 24h when known.';
