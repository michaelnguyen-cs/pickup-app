-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 12: Admin RPC authorization
--
-- Problem: approve_run_candidate, reject_run_candidate,
-- flag_run_candidate_for_clarification, and get_pending_run_candidates are all
-- SECURITY DEFINER. get_pending_run_candidates was restricted to `authenticated`,
-- but the other three had no REVOKE/GRANT at all, which means Postgres left
-- them at the default: EXECUTE granted to PUBLIC. Combined with no in-function
-- check of caller identity, any authenticated user — and, for the three
-- ungated functions, even anon — could call them directly via the Supabase
-- client and approve/reject/flag arbitrary run_candidates or read the full
-- pending queue. The client-side EXPO_PUBLIC_ADMIN_EMAIL check in ProfileScreen
-- only hides a button; it is not enforced anywhere the database can see.
--
-- Fix (Option A — separate admins table):
--   1. public.admins — an explicit allowlist of admin user_ids. RLS is
--      enabled with zero policies, so no role (anon, authenticated) can
--      read or write it directly through PostgREST. Only SECURITY DEFINER
--      functions owned by a bypassrls-capable role (the migration/owner role,
--      as with run_candidates in phase7) can see it.
--   2. public.is_admin() — SECURITY DEFINER helper that checks whether
--      auth.uid() is present in public.admins. Returns false (not an error)
--      for anon callers, since auth.uid() is NULL for them.
--   3. Each of the four RPCs gets `IF NOT public.is_admin() THEN RAISE
--      EXCEPTION ... END IF;` as the first statement, so authorization is
--      enforced inside the database regardless of what the client sends.
--   4. EXECUTE on all four functions is revoked from PUBLIC and granted only
--      to `authenticated`, matching the pattern already used for
--      get_pending_run_candidates. This isn't the primary control (the
--      is_admin() guard is) but it keeps anon from reaching the functions
--      at all and matches existing convention.
--
-- Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS throughout).
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. public.admins — explicit admin allowlist
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admins (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admins IS
  'Explicit admin allowlist. RLS enabled with no policies — unreadable and '
  'unwritable via PostgREST/anon/authenticated. Only SECURITY DEFINER '
  'functions owned by the migration role (e.g. is_admin()) can read it.';

-- RLS is enabled with NO policies, intentionally. Nobody gets a row back
-- through the API; membership is only ever checked via is_admin().
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. public.is_admin() — membership check
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True if the calling auth.uid() is present in public.admins. False for '
  'anon (auth.uid() is NULL) and for any authenticated non-admin user.';

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. approve_run_candidate — add admin guard as first statement
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

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

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
  'Returns the new run id. Raises if the caller is not an admin, the candidate '
  'is already processed, or the venue is unresolved.';

REVOKE EXECUTE ON FUNCTION public.approve_run_candidate(uuid, uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_run_candidate(uuid, uuid, uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. reject_run_candidate — add admin guard as first statement
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

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

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
  'Marks a run_candidate rejected. Idempotent. Raises if the caller is not an '
  'admin or the candidate is already approved.';

REVOKE EXECUTE ON FUNCTION public.reject_run_candidate(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reject_run_candidate(uuid, uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. flag_run_candidate_for_clarification — add admin guard as first statement
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

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

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
  'Sets a candidate to needs_clarification. Appends an optional reviewer note '
  'to existing notes. Raises if the caller is not an admin.';

REVOKE EXECUTE ON FUNCTION public.flag_run_candidate_for_clarification(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.flag_run_candidate_for_clarification(uuid, uuid, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_pending_run_candidates — add admin guard as first statement
--
-- Was LANGUAGE sql; converted to plpgsql so it can RAISE EXCEPTION before
-- running the query. Query body is unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_pending_run_candidates()
RETURNS TABLE (
  id               uuid,
  venue_id         uuid,
  venue_name       text,
  title            text,
  sport_id         text,
  day_of_week      text,
  start_time       text,
  end_time         text,
  skill_level      text,
  is_indoor        boolean,
  notes            text,
  source_url       text,
  source_name      text,
  source_type      text,
  confidence_score float8,  -- cast from numeric so JS receives a number, not a string
  needs_review     boolean,
  review_status    text,
  last_seen_at     timestamptz,
  created_at       timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    rc.id,
    rc.venue_id,
    v.name          AS venue_name,
    rc.title,
    rc.sport_id,
    rc.day_of_week,
    rc.start_time,
    rc.end_time,
    rc.skill_level,
    rc.is_indoor,
    rc.notes,
    rc.source_url,
    rc.source_name,
    rc.source_type,
    rc.confidence_score::float8,
    rc.needs_review,
    rc.review_status,
    rc.last_seen_at,
    rc.created_at
  FROM public.run_candidates rc
  LEFT JOIN public.venues v ON v.id = rc.venue_id
  WHERE rc.review_status IN ('pending', 'needs_clarification')
  ORDER BY rc.needs_review DESC, rc.confidence_score ASC, rc.created_at ASC;

END;
$$;

COMMENT ON FUNCTION public.get_pending_run_candidates() IS
  'Returns pending and needs_clarification run_candidates joined with venue name. '
  'SECURITY DEFINER bypasses the no-read-access RLS on run_candidates. '
  'Raises unless the caller is an admin (see public.is_admin()).';

-- Authenticated users can call this; anon cannot. is_admin() is still the
-- real gate — this grant only controls who can reach the function at all.
REVOKE EXECUTE ON FUNCTION public.get_pending_run_candidates() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_run_candidates() TO authenticated;
