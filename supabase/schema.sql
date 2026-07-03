-- Pick-Up — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Order matters: referenced tables must exist before foreign keys are created.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- One row per auth user. Created automatically via trigger on auth.users insert.
-- id mirrors auth.users.id — no separate PK needed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text        UNIQUE,
  full_name       text,
  avatar_url      text,
  sports          jsonb       DEFAULT '[]'::jsonb,   -- e.g. ["basketball","soccer"]
  skill_level     text        CHECK (skill_level IN ('beginner','casual','intermediate','competitive','mixed')),
  indoor_outdoor  text        CHECK (indoor_outdoor IN ('indoor','outdoor','both')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profile data. Extends auth.users 1:1.';
COMMENT ON COLUMN public.profiles.sports IS 'jsonb array of SportId strings from onboarding';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VENUES
-- Physical places where pickup games happen.
-- Publicly readable. Written by admins / service role only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.venues (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  sport_id         text        NOT NULL,   -- primary sport e.g. 'basketball'
  address          text        NOT NULL,
  city             text        NOT NULL,
  state            text        NOT NULL,
  latitude         float8      NOT NULL,
  longitude        float8      NOT NULL,
  image_url        text,
  is_indoor        boolean     NOT NULL DEFAULT false,
  description      text,
  popularity_score integer     NOT NULL DEFAULT 50 CHECK (popularity_score BETWEEN 0 AND 100),
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.venues IS 'Physical venues where pickup games take place.';
COMMENT ON COLUMN public.venues.sport_id IS 'Primary sport. Additional sports can be added as a separate sports[] column later.';
COMMENT ON COLUMN public.venues.popularity_score IS '0–100 crowdsource score. Future: computed from run_attendance counts.';

-- Index for geo queries (bounding box lookups before Haversine filter)
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_venues_city     ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_sport    ON public.venues(sport_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RUNS
-- Recurring pickup games at a venue.
-- Each row = one recurring time slot (e.g. "Tuesday 6–9 PM basketball at YMCA").
-- A run that meets Mon + Thu has two rows with the same venue_id + title.
-- Publicly readable. Written by admins / service role only (initially).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.runs (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     uuid    NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title        text    NOT NULL,
  sport_id     text    NOT NULL,
  day_of_week  text    NOT NULL CHECK (day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
  start_time   text    NOT NULL,   -- 'HH:MM' 24h e.g. '18:00'
  end_time     text    NOT NULL,   -- 'HH:MM' 24h e.g. '21:00'
  skill_level  text    NOT NULL DEFAULT 'casual'
                       CHECK (skill_level IN ('beginner','casual','intermediate','competitive','mixed')),
  is_indoor    boolean NOT NULL DEFAULT false,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.runs IS 'Recurring pickup game time slots. One row per day/time occurrence.';
COMMENT ON COLUMN public.runs.day_of_week IS 'mon|tue|wed|thu|fri|sat|sun';
COMMENT ON COLUMN public.runs.start_time  IS 'HH:MM in 24h format, e.g. 18:00';
COMMENT ON COLUMN public.runs.end_time    IS 'HH:MM in 24h format, e.g. 21:00';

CREATE INDEX IF NOT EXISTS idx_runs_venue_id    ON public.runs(venue_id);
CREATE INDEX IF NOT EXISTS idx_runs_sport       ON public.runs(sport_id);
CREATE INDEX IF NOT EXISTS idx_runs_day_of_week ON public.runs(day_of_week);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SAVED_VENUES
-- User-bookmarked venues. Composite PK prevents duplicates.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_venues (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id   uuid        NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_venues_user ON public.saved_venues(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SAVED_RUNS
-- User-bookmarked recurring runs.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_runs (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id     uuid        NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, run_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_runs_user ON public.saved_runs(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RUN_ATTENDANCE
-- Whether a user plans to attend a specific run occurrence.
-- status: 'attending' | 'maybe' | 'not_attending'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.run_attendance (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id     uuid        NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'attending'
                         CHECK (status IN ('attending','maybe','not_attending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, run_id)
);

CREATE INDEX IF NOT EXISTS idx_run_attendance_run ON public.run_attendance(run_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_venues   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_attendance ENABLE ROW LEVEL SECURITY;

-- ── venues: public read, no user write ───────────────────────────────────────
CREATE POLICY "venues_public_read"
  ON public.venues FOR SELECT
  USING (true);

-- ── runs: public read, no user write ─────────────────────────────────────────
CREATE POLICY "runs_public_read"
  ON public.runs FOR SELECT
  USING (true);

-- ── profiles: users manage only their own row ─────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── saved_venues: users manage only their own rows ────────────────────────────
CREATE POLICY "saved_venues_select_own"
  ON public.saved_venues FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_venues_insert_own"
  ON public.saved_venues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_venues_delete_own"
  ON public.saved_venues FOR DELETE
  USING (auth.uid() = user_id);

-- ── saved_runs: users manage only their own rows ──────────────────────────────
CREATE POLICY "saved_runs_select_own"
  ON public.saved_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_runs_insert_own"
  ON public.saved_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_runs_delete_own"
  ON public.saved_runs FOR DELETE
  USING (auth.uid() = user_id);

-- ── run_attendance: users manage only their own rows ──────────────────────────
CREATE POLICY "run_attendance_select_own"
  ON public.run_attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "run_attendance_insert_own"
  ON public.run_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "run_attendance_update_own"
  ON public.run_attendance FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "run_attendance_delete_own"
  ON public.run_attendance FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RUN_REPORTS
-- User-submitted reports about a run (no one showed up, wrong time, etc.)
-- One row per report; multiple reports from the same user on the same run
-- are allowed so that successive visits can each be reported independently.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.run_reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id      uuid        NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  report_type text        NOT NULL CHECK (report_type IN ('no_one_there','wrong_time','closed_location')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_run_reports_run  ON public.run_reports(run_id);
CREATE INDEX IF NOT EXISTS idx_run_reports_user ON public.run_reports(user_id);

ALTER TABLE public.run_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports; can read back their own reports only
CREATE POLICY "run_reports_insert_own"
  ON public.run_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "run_reports_select_own"
  ON public.run_reports FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- Runs as SECURITY DEFINER so it can insert into profiles even before the
-- user's session is established. Triggered after every auth.users INSERT.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop first to avoid duplicate trigger error on re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
