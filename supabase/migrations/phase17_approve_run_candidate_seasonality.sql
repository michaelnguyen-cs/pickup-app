-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 17: approve_run_candidate — carry seasonality into runs
--
-- approve_run_candidate() was written before Phase 16 added is_seasonal /
-- season_start_month / season_end_month / season_notes, so its INSERT INTO
-- runs never copied them — a seasonal candidate (e.g. "closed Nov-April")
-- would promote into a runs row that silently claims year-round operation.
--
-- This redefines the function with those four columns added to the
-- INSERT/VALUES list. Everything else (locking, guards, exception
-- messages, the run_candidates UPDATE afterward) is unchanged.
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
    verification_method,
    is_seasonal,
    season_start_month,
    season_end_month,
    season_notes
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
    'admin_review',
    v_candidate.is_seasonal,
    v_candidate.season_start_month,
    v_candidate.season_end_month,
    v_candidate.season_notes
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
  'Carries seasonality fields (Phase 16) into the new run. '
  'Returns the new run id. Raises if the candidate is already processed or venue is unresolved.';
