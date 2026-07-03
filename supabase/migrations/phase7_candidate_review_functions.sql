-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 7: Candidate review functions
--
-- Run this AFTER phase7_ingestion_foundation.sql.
-- Safe to re-run (CREATE OR REPLACE).
--
-- Functions:
--   approve_run_candidate(candidate_id, reviewer_id, venue_id?)
--     Promotes a candidate into runs and marks it approved.
--     Returns the new run.id.
--
--   reject_run_candidate(candidate_id, reviewer_id)
--     Marks a candidate rejected. Idempotent — safe to call twice.
--
--   flag_run_candidate_for_clarification(candidate_id, reviewer_id, note?)
--     Sets review_status = 'needs_clarification'. Does not insert a run.
--
-- All functions use SECURITY DEFINER so they can write to `runs`
-- (which has no user-facing INSERT policy) when called by an authenticated
-- admin. In production, wrap these in an admin-only API route or restrict
-- EXECUTE to a dedicated role rather than PUBLIC.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- approve_run_candidate
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Field mapping: run_candidates → runs
--
--   candidates.venue_id         → runs.venue_id         (required; p_venue_id overrides)
--   candidates.title            → runs.title
--   candidates.sport_id         → runs.sport_id
--   candidates.day_of_week      → runs.day_of_week
--   candidates.start_time       → runs.start_time
--   candidates.end_time         → runs.end_time
--   candidates.skill_level      → runs.skill_level
--   candidates.is_indoor        → runs.is_indoor
--   candidates.notes            → runs.notes
--   candidates.source_url       → runs.source_url
--   'ai_extracted'  (constant)  → runs.source_type      (not copied verbatim —
--                                                         candidate source_type is the
--                                                         medium, e.g. 'website'. runs
--                                                         source_type is the provenance
--                                                         category, e.g. 'ai_extracted')
--   candidates.confidence_score → runs.confidence_score
--   now()           (constant)  → runs.last_verified_at (reviewer just confirmed it)
--   'admin_review'  (constant)  → runs.verification_method
--
-- Edge cases:
--   venue_id NULL  → raises exception unless p_venue_id is supplied
--   venue not found → raises exception
--   already approved → raises exception (prevents duplicate run insertion)
--   already rejected → raises exception (must un-reject manually if needed)
--   needs_clarification → allowed; reviewer resolved it and is now approving
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_run_candidate(
  p_candidate_id uuid,
  p_reviewer_id  uuid,
  p_venue_id     uuid DEFAULT NULL  -- supply when candidate.venue_id is NULL
)
RETURNS uuid  -- the newly inserted runs.id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate  public.run_candidates%ROWTYPE;
  v_venue_id   uuid;
  v_run_id     uuid;
BEGIN

  -- Lock the candidate row for the duration of the transaction.
  -- Prevents two concurrent approvals from inserting duplicate runs.
  SELECT * INTO v_candidate
  FROM public.run_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'run_candidate % not found', p_candidate_id;
  END IF;

  -- Guard against re-processing an already-decided candidate.
  -- approved: would create a second live run for the same source entry.
  -- rejected: reviewer must explicitly un-reject before re-approving.
  IF v_candidate.review_status = 'approved' THEN
    RAISE EXCEPTION
      'run_candidate % is already approved (run_id: %). Cannot approve twice.',
      p_candidate_id, v_candidate.approved_run_id;
  END IF;

  IF v_candidate.review_status = 'rejected' THEN
    RAISE EXCEPTION
      'run_candidate % is rejected. Reset review_status to pending before approving.',
      p_candidate_id;
  END IF;

  -- Resolve venue: parameter overrides candidate value.
  -- If neither is set, we cannot insert into runs (venue_id NOT NULL).
  v_venue_id := COALESCE(p_venue_id, v_candidate.venue_id);

  IF v_venue_id IS NULL THEN
    RAISE EXCEPTION
      'venue_id is required to approve run_candidate %. '
      'Pass p_venue_id, or update the candidate''s venue_id first.',
      p_candidate_id;
  END IF;

  -- Verify the venue actually exists before inserting.
  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id = v_venue_id) THEN
    RAISE EXCEPTION 'venue % does not exist in public.venues', v_venue_id;
  END IF;

  -- ── Promote: insert into runs ──────────────────────────────────────────────
  INSERT INTO public.runs (
    venue_id,
    title,
    sport_id,
    day_of_week,
    start_time,
    end_time,
    skill_level,
    is_indoor,
    notes,
    source_url,
    source_type,       -- always 'ai_extracted'; candidate.source_type is the medium
    confidence_score,
    last_verified_at,  -- reviewer just confirmed the entry is accurate
    verification_method
  )
  VALUES (
    v_venue_id,
    v_candidate.title,
    v_candidate.sport_id,
    v_candidate.day_of_week,
    v_candidate.start_time,
    v_candidate.end_time,
    v_candidate.skill_level,
    v_candidate.is_indoor,
    v_candidate.notes,
    v_candidate.source_url,
    'ai_extracted',
    v_candidate.confidence_score,
    now(),
    'admin_review'
  )
  RETURNING id INTO v_run_id;

  -- ── Mark the candidate approved and link it to the new run ─────────────────
  UPDATE public.run_candidates
  SET
    review_status   = 'approved',
    reviewed_by     = p_reviewer_id,
    reviewed_at     = now(),
    approved_run_id = v_run_id,
    -- Backfill venue_id on the candidate if it was supplied as a parameter.
    -- Keeps the candidate record self-consistent for future audits.
    venue_id        = v_venue_id
  WHERE id = p_candidate_id;

  RETURN v_run_id;

END;
$$;

COMMENT ON FUNCTION public.approve_run_candidate(uuid, uuid, uuid) IS
  'Promotes a run_candidate into the live runs table and marks it approved. '
  'Returns the new run id. Raises if the candidate is already processed or venue is unresolved.';


-- ─────────────────────────────────────────────────────────────────────────────
-- reject_run_candidate
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Marks a candidate rejected. Does not touch the runs table.
-- Idempotent: calling this on an already-rejected candidate is a no-op.
-- Raises if the candidate is already approved (can't un-promote a run here).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reject_run_candidate(
  p_candidate_id uuid,
  p_reviewer_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate public.run_candidates%ROWTYPE;
BEGIN

  SELECT * INTO v_candidate
  FROM public.run_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'run_candidate % not found', p_candidate_id;
  END IF;

  -- Cannot reject an approved candidate — that would orphan the live run.
  -- The caller should delete the run first if it needs to be removed.
  IF v_candidate.review_status = 'approved' THEN
    RAISE EXCEPTION
      'run_candidate % is already approved (run_id: %). '
      'Delete the associated run before rejecting the candidate.',
      p_candidate_id, v_candidate.approved_run_id;
  END IF;

  -- Idempotent: re-rejecting is a no-op, not an error.
  IF v_candidate.review_status = 'rejected' THEN
    RETURN;
  END IF;

  UPDATE public.run_candidates
  SET
    review_status = 'rejected',
    reviewed_by   = p_reviewer_id,
    reviewed_at   = now()
  WHERE id = p_candidate_id;

END;
$$;

COMMENT ON FUNCTION public.reject_run_candidate(uuid, uuid) IS
  'Marks a run_candidate rejected. Idempotent. Raises if the candidate is already approved.';


-- ─────────────────────────────────────────────────────────────────────────────
-- flag_run_candidate_for_clarification
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Sets review_status = 'needs_clarification' without making a final decision.
-- Used when the reviewer can see the problem but can't resolve it immediately —
-- e.g. the end time is ambiguous and needs a call to the venue.
--
-- The optional p_note parameter appends the reviewer's concern to
-- the existing notes field so the context travels with the candidate.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.flag_run_candidate_for_clarification(
  p_candidate_id uuid,
  p_reviewer_id  uuid,
  p_note         text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate public.run_candidates%ROWTYPE;
BEGIN

  SELECT * INTO v_candidate
  FROM public.run_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'run_candidate % not found', p_candidate_id;
  END IF;

  IF v_candidate.review_status = 'approved' THEN
    RAISE EXCEPTION
      'run_candidate % is already approved. Cannot flag after promotion.',
      p_candidate_id;
  END IF;

  UPDATE public.run_candidates
  SET
    review_status = 'needs_clarification',
    needs_review  = true,
    reviewed_by   = p_reviewer_id,
    reviewed_at   = now(),
    -- Append the note rather than overwriting — preserves AI-generated notes
    notes = CASE
      WHEN p_note IS NULL         THEN notes
      WHEN notes IS NULL          THEN p_note
      ELSE notes || E'\n[Reviewer] ' || p_note
    END
  WHERE id = p_candidate_id;

END;
$$;

COMMENT ON FUNCTION public.flag_run_candidate_for_clarification(uuid, uuid, text) IS
  'Sets a candidate to needs_clarification. Appends an optional reviewer note to existing notes.';


-- ─────────────────────────────────────────────────────────────────────────────
-- EXAMPLE CALLS
-- Replace the UUIDs with real values from your run_candidates table.
-- The reviewer UUID should come from auth.users.
-- ─────────────────────────────────────────────────────────────────────────────

/*

-- Approve a high-confidence candidate whose venue is already linked:
SELECT public.approve_run_candidate(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- candidate id
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'   -- reviewer (auth.users) id
);

-- Approve a candidate where venue_id was NULL on insert (YMCA not yet in venues):
SELECT public.approve_run_candidate(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- candidate id
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',  -- reviewer id
  'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz' -- venue id (must exist in public.venues)
);

-- Reject a bad extraction:
SELECT public.reject_run_candidate(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
);

-- Flag for clarification with a note:
SELECT public.flag_run_candidate_for_clarification(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
  'End time needs verification — called venue, left voicemail. Check back Thursday.'
);

-- Fetch the pending review queue (most uncertain first):
SELECT
  id,
  title,
  sport_id,
  day_of_week,
  start_time,
  end_time,
  confidence_score,
  needs_review,
  source_name,
  source_url,
  notes,
  created_at
FROM public.run_candidates
WHERE review_status IN ('pending', 'needs_clarification')
ORDER BY needs_review DESC, confidence_score ASC, created_at ASC;

-- Check what a candidate will map to before approving (dry run):
SELECT
  c.id             AS candidate_id,
  v.id             AS venue_id,
  v.name           AS venue_name,
  c.title,
  c.sport_id,
  c.day_of_week,
  c.start_time,
  c.end_time,
  c.skill_level,
  c.is_indoor,
  c.notes,
  c.source_url,
  'ai_extracted'   AS source_type,
  c.confidence_score,
  c.needs_review,
  c.review_status
FROM public.run_candidates c
LEFT JOIN public.venues v ON v.id = c.venue_id
WHERE c.id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

*/
