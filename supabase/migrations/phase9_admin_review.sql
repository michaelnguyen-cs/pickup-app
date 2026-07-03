-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 9: Admin candidate review
--
-- run_candidates has RLS enabled with no user-facing policies.
-- get_pending_run_candidates() uses SECURITY DEFINER to read across all rows
-- and returns only the fields needed for the review UI (no raw_text / json).
--
-- Access restriction: granted to `authenticated` only (not anon).
-- Client-side: the review screen additionally gates on EXPO_PUBLIC_ADMIN_EMAIL.
-- Production hardening: add an is_admin check inside the function body once
-- an is_admin flag is added to public.profiles.
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION public.get_pending_run_candidates() IS
  'Returns pending and needs_clarification run_candidates joined with venue name. '
  'SECURITY DEFINER bypasses the no-read-access RLS on run_candidates. '
  'Granted to authenticated only — not callable by guests.';

-- Authenticated users can call this; anon cannot
REVOKE EXECUTE ON FUNCTION public.get_pending_run_candidates() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_pending_run_candidates() TO authenticated;
