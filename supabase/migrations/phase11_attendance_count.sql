-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 11: attendance count RPC
--
-- run_attendance has a user-scoped SELECT policy, so clients can only read
-- their own rows. This SECURITY DEFINER function counts across all users
-- for a given run, returning only an aggregate — no individual data exposed.
--
-- Granted to anon as well as authenticated so non-logged-in users can see
-- the "X going" count when browsing runs.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_run_attendance_count(p_run_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.run_attendance
  WHERE run_id = p_run_id
    AND status = 'attending';
$$;

COMMENT ON FUNCTION public.get_run_attendance_count(uuid) IS
  'Returns the number of users with status=attending for a run. '
  'SECURITY DEFINER bypasses user-scoped RLS on run_attendance. '
  'Returns only a count — no individual user data is exposed.';

REVOKE EXECUTE ON FUNCTION public.get_run_attendance_count(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_run_attendance_count(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_run_attendance_count(uuid) TO anon;
