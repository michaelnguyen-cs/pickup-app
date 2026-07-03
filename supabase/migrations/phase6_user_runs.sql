-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 6: USER RUNS + BACKEND ENFORCEMENT
--
-- Run this in the Supabase SQL Editor AFTER the baseline schema.sql and the
-- phase35_age_gate.sql migration. Safe to re-run (IF NOT EXISTS / OR REPLACE).
--
-- Changes in this migration:
--   1. Extend `venues` with enforcement + Phase 5 reservation metadata
--   2. Create `user_runs` — user-created one-time pickup events
--   3. Create `run_participants` — who has joined a user run
--   4. RLS policies for both new tables
--   5. Indexes
--   6. RPC: create_run(...)  — enforces all business rules server-side
--   7. RPC: cancel_run(...)  — owner-only soft-cancel
--   8. RPC: join_run(...)    — enforces age gate, cap, and expiry
--   9. RPC: get_run_participant_count(...) — safe aggregate for UI
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND `venues`
-- ─────────────────────────────────────────────────────────────────────────────

-- venue_type mirrors the TypeScript VenueType union. Used for tier logic in RPCs.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS venue_type        text        DEFAULT 'rec_center',
  ADD COLUMN IF NOT EXISTS sports            text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_blocked        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_policy text       CHECK (
    reservation_policy IN ('required', 'peak_only', 'recommended', 'first_come')
  ),
  ADD COLUMN IF NOT EXISTS reservation_url   text,
  ADD COLUMN IF NOT EXISTS busy_hours_note   text;

COMMENT ON COLUMN public.venues.venue_type         IS 'Matches the TypeScript VenueType union. Drives tier classification.';
COMMENT ON COLUMN public.venues.sports             IS 'All sports supported at this venue. Array of SportId strings.';
COMMENT ON COLUMN public.venues.is_blocked         IS 'True for private/Tier-3 venues where run creation is not permitted.';
COMMENT ON COLUMN public.venues.reservation_policy IS 'How reservations work at this venue. Null = no info available.';
COMMENT ON COLUMN public.venues.reservation_url    IS 'Official booking page. Opened in browser by the app.';
COMMENT ON COLUMN public.venues.busy_hours_note    IS 'Human-readable availability note shown in VenueDetailScreen.';

-- Backfill sports[] from the existing single sport_id so create_run RPC checks
-- sport compatibility correctly against existing seed data.
UPDATE public.venues
SET sports = ARRAY[sport_id]
WHERE cardinality(sports) = 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `user_runs` — USER-CREATED ONE-TIME PICKUP EVENTS
--
-- Distinct from `runs` (admin-curated recurring schedules).
-- Each row is a single event at a specific datetime, tied to a real venue.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_runs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid        NOT NULL REFERENCES public.venues(id),
  created_by  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport       text        NOT NULL,
  title       text        NOT NULL,
  description text,
  start_time  timestamptz NOT NULL,
  end_time    timestamptz NOT NULL,
  skill_level text        NOT NULL DEFAULT 'casual'
              CHECK (skill_level IN ('beginner', 'casual', 'intermediate', 'competitive', 'mixed')),
  max_players integer     NOT NULL DEFAULT 10 CHECK (max_players BETWEEN 2 AND 30),
  status      text        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'cancelled', 'completed')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_runs_end_after_start CHECK (end_time > start_time)
);

COMMENT ON TABLE  public.user_runs IS 'One-time pickup events created by app users. Separate from admin-curated recurring `runs`.';
COMMENT ON COLUMN public.user_runs.venue_id    IS 'Required FK — runs must always be tied to a real venue record.';
COMMENT ON COLUMN public.user_runs.created_by  IS 'The user who created this run. Only they can cancel it.';
COMMENT ON COLUMN public.user_runs.sport       IS 'Must be compatible with the venue sports[] array (enforced by create_run RPC).';
COMMENT ON COLUMN public.user_runs.start_time  IS 'Absolute timestamptz, not day_of_week + HH:MM like recurring runs.';
COMMENT ON COLUMN public.user_runs.status      IS 'active = joinable; cancelled = soft-deleted; completed = past the end_time.';
COMMENT ON COLUMN public.user_runs.max_players IS 'Hard cap enforced by join_run RPC. 2–30 inclusive.';

CREATE INDEX IF NOT EXISTS idx_user_runs_venue_id   ON public.user_runs(venue_id);
CREATE INDEX IF NOT EXISTS idx_user_runs_created_by ON public.user_runs(created_by);
CREATE INDEX IF NOT EXISTS idx_user_runs_status     ON public.user_runs(status);
CREATE INDEX IF NOT EXISTS idx_user_runs_start_time ON public.user_runs(start_time);

-- Partial index — most common query: active future runs
CREATE INDEX IF NOT EXISTS idx_user_runs_active_future
  ON public.user_runs(start_time)
  WHERE status = 'active';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. `run_participants` — WHO HAS JOINED A USER RUN
--
-- Composite PK prevents duplicate participation rows.
-- The creator is auto-inserted by the create_run RPC.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.run_participants (
  run_id    uuid        NOT NULL REFERENCES public.user_runs(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, user_id)
);

COMMENT ON TABLE  public.run_participants IS 'Participation rows for user_runs. Creator is auto-added on run creation.';
COMMENT ON COLUMN public.run_participants.run_id  IS 'FK to user_runs.id.';
COMMENT ON COLUMN public.run_participants.user_id IS 'FK to auth.users.id. Composite PK prevents duplicates.';

CREATE INDEX IF NOT EXISTS idx_run_participants_run  ON public.run_participants(run_id);
CREATE INDEX IF NOT EXISTS idx_run_participants_user ON public.run_participants(user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_participants ENABLE ROW LEVEL SECURITY;

-- user_runs: public read, authenticated create, owner-only update (cancel)
CREATE POLICY "user_runs_public_read"
  ON public.user_runs FOR SELECT
  USING (true);

CREATE POLICY "user_runs_insert_own"
  ON public.user_runs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "user_runs_update_own"
  ON public.user_runs FOR UPDATE
  USING  (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- No DELETE policy — cancellation is a status update, not a hard delete.

-- run_participants: public count read, own-row manage
CREATE POLICY "run_participants_public_read"
  ON public.run_participants FOR SELECT
  USING (true);

CREATE POLICY "run_participants_insert_own"
  ON public.run_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "run_participants_delete_own"
  ON public.run_participants FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: create_run
--
-- Centralises all creation business rules so the frontend cannot bypass them.
-- Returns a JSON object with either { success: true, run_id: uuid }
-- or { error: <code> } where error codes match constants in the frontend
-- query layer (src/lib/queries/userRuns.ts).
--
-- Rules enforced:
--   ✓ Caller must be authenticated
--   ✓ Caller must have age_confirmed = true
--   ✓ Caller must not already have an active, non-expired run
--   ✓ Venue must exist
--   ✓ Venue must not be blocked (is_blocked = false)
--   ✓ Sport must be in venues.sports[] (if non-empty)
--   ✓ start_time must be in the future (5-min grace window)
--   ✓ end_time must be after start_time
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_run(
  p_venue_id    uuid,
  p_sport       text,
  p_start_time  timestamptz,
  p_end_time    timestamptz,
  p_skill_level text    DEFAULT 'casual',
  p_max_players integer DEFAULT 10,
  p_notes       text    DEFAULT NULL,
  p_title       text    DEFAULT NULL   -- auto-generated from sport if omitted
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_profile  public.profiles%ROWTYPE;
  v_venue    public.venues%ROWTYPE;
  v_existing public.user_runs%ROWTYPE;
  v_run_id   uuid;
  v_title    text;
BEGIN
  -- 1. Authentication
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- 2. Age gate
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND OR NOT v_profile.age_confirmed THEN
    RETURN json_build_object('error', 'age_not_confirmed');
  END IF;

  -- 3. One-active-run rule
  SELECT * INTO v_existing
  FROM   public.user_runs
  WHERE  created_by = v_user_id
    AND  status     = 'active'
    AND  end_time   > now()
  LIMIT 1;
  IF FOUND THEN
    RETURN json_build_object('error', 'active_run_exists', 'run_id', v_existing.id);
  END IF;

  -- 4. Venue existence
  SELECT * INTO v_venue FROM public.venues WHERE id = p_venue_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'venue_not_found');
  END IF;

  -- 5. Venue not blocked (Tier 3 enforcement)
  IF v_venue.is_blocked THEN
    RETURN json_build_object('error', 'venue_blocked');
  END IF;

  -- 6. Sport compatibility (only checked when venue.sports[] is non-empty)
  IF cardinality(v_venue.sports) > 0 AND NOT (p_sport = ANY(v_venue.sports)) THEN
    RETURN json_build_object('error', 'sport_not_compatible');
  END IF;

  -- 7. Time validation
  IF p_start_time < now() - interval '5 minutes' THEN
    RETURN json_build_object('error', 'start_time_in_past');
  END IF;
  IF p_end_time <= p_start_time THEN
    RETURN json_build_object('error', 'end_before_start');
  END IF;

  -- 8. Auto-generate title if not supplied
  v_title := COALESCE(
    p_title,
    initcap(p_sport) || ' Run at ' || v_venue.name
  );

  -- 9. Insert the run
  INSERT INTO public.user_runs (
    venue_id, created_by, sport, title,
    start_time, end_time, skill_level, max_players, notes
  )
  VALUES (
    p_venue_id, v_user_id, p_sport, v_title,
    p_start_time, p_end_time, p_skill_level, p_max_players, p_notes
  )
  RETURNING id INTO v_run_id;

  -- 10. Auto-join creator as first participant
  INSERT INTO public.run_participants (run_id, user_id)
  VALUES (v_run_id, v_user_id);

  RETURN json_build_object('success', true, 'run_id', v_run_id);
END;
$$;

COMMENT ON FUNCTION public.create_run IS
  'Creates a user run with full server-side validation. '
  'Returns { success: true, run_id } or { error: <code> }.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: cancel_run
--
-- Soft-cancel: sets status = ''cancelled''. Does not delete.
-- Only the run creator can cancel. Cannot cancel an already-cancelled run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_run(p_run_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_run     public.user_runs%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_run FROM public.user_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'run_not_found');
  END IF;
  IF v_run.created_by != v_user_id THEN
    RETURN json_build_object('error', 'not_owner');
  END IF;
  IF v_run.status != 'active' THEN
    RETURN json_build_object('error', 'run_not_active', 'current_status', v_run.status);
  END IF;

  UPDATE public.user_runs SET status = 'cancelled' WHERE id = p_run_id;
  RETURN json_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.cancel_run IS
  'Soft-cancels a user run. Only the creator can cancel. '
  'Returns { success: true } or { error: <code> }.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC: join_run
--
-- Adds the caller to run_participants after checking:
--   ✓ Authenticated + age confirmed
--   ✓ Run exists, is active, has not expired
--   ✓ Participant cap not reached
-- Idempotent: joining twice is silently ignored (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.join_run(p_run_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_run     public.user_runs%ROWTYPE;
  v_count   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND OR NOT v_profile.age_confirmed THEN
    RETURN json_build_object('error', 'age_not_confirmed');
  END IF;

  SELECT * INTO v_run FROM public.user_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'run_not_found');
  END IF;
  IF v_run.status != 'active' THEN
    RETURN json_build_object('error', 'run_not_active');
  END IF;
  IF v_run.end_time <= now() THEN
    RETURN json_build_object('error', 'run_expired');
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM   public.run_participants
  WHERE  run_id = p_run_id;

  IF v_count >= v_run.max_players THEN
    RETURN json_build_object('error', 'run_full', 'max_players', v_run.max_players);
  END IF;

  INSERT INTO public.run_participants (run_id, user_id)
  VALUES (p_run_id, v_user_id)
  ON CONFLICT (run_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.join_run IS
  'Adds the caller to a user run. Enforces age gate, active status, expiry, and player cap. '
  'Idempotent — joining twice is silently ignored.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC: get_run_participant_count
--
-- Returns the current participant count for a user_run.
-- SECURITY DEFINER + STABLE so it bypasses RLS for an aggregate-only read.
-- Used by the UI to show "X / Y players" without exposing individual rows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_run_participant_count(p_run_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM   public.run_participants
  WHERE  run_id = p_run_id;
$$;

COMMENT ON FUNCTION public.get_run_participant_count IS
  'Returns participant count for a user_run. STABLE + SECURITY DEFINER — count-only, no individual rows exposed.';
