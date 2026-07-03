-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 8: Trust and freshness signals
--
-- run_reports has a user-scoped SELECT policy, so client queries can only
-- see the current user's own reports. get_run_recent_report_count bypasses
-- that restriction with SECURITY DEFINER to return the aggregate count for
-- all users — no personal data is exposed, only a number.
--
-- Callable by both authenticated users and guests (anon role) so the trust
-- signal renders for every visitor to a run detail page.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_run_recent_report_count(p_run_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.run_reports
  WHERE run_id = p_run_id
    AND created_at >= now() - INTERVAL '30 days';
$$;

COMMENT ON FUNCTION public.get_run_recent_report_count(uuid) IS
  'Returns the number of user reports filed against a run in the past 30 days. '
  'SECURITY DEFINER so it can count across all users despite the user-scoped RLS policy on run_reports.';

-- Allow both signed-in users and guests to call this function
GRANT EXECUTE ON FUNCTION public.get_run_recent_report_count(uuid) TO authenticated, anon;
