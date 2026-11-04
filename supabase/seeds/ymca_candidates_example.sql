-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 7: Manual ingestion — YMCA of Valley Glen (example)
--
-- Source page : https://ymca-valleyglen.org/program-schedule
-- Parsed on   : 2026-04-20
-- Ingested by : service role (manual pipeline run)
--
-- The source page had two distinct schedule sections:
--   (A) A structured HTML table listing morning open-gym slots
--   (B) A prose paragraph describing evening pickup basketball
--
-- Section A produced two candidates:
--   [1] Monday AM — clean single-day table row, high confidence
--   [2] Wednesday AM — split from a combined "Wed/Fri" cell, flagged for review
--
-- Section B produced one candidate:
--   [3] Tuesday evening — prose with approximate end time, flagged for review
--
-- Note: the AI also extracted Wednesday/Friday AM and Thursday evening entries
-- that follow the same pattern as rows [2] and [3] respectively. Those are
-- omitted here for brevity but would be inserted the same way.
--
-- venue_id is NULL on all rows: YMCA of Valley Glen is not yet in the venues
-- table. The reviewer will either match it to an existing venue or create a new
-- one before approving any of these candidates.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── [1] Monday AM Open Gym ────────────────────────────────────────────────────
-- Source: structured HTML table row — unambiguous single day, stated times.
-- needs_review = false: confidence is above threshold; safe to approve
--   directly without human scrutiny beyond a quick sanity check.

INSERT INTO public.run_candidates (
  venue_id,
  title, sport_id, day_of_week, start_time, end_time,
  skill_level, is_indoor, notes,
  source_url, source_name, source_type,
  raw_text,
  extracted_json,
  confidence_score, needs_review, review_status,
  last_seen_at
)
VALUES (
  NULL,
  'Open Gym Basketball',
  'basketball',
  'mon',
  '06:00',
  '08:00',
  'casual',
  true,
  NULL,
  'https://ymca-valleyglen.org/program-schedule',
  'YMCA of Valley Glen',
  'website',

  -- Verbatim text chunk fed to the model
  'BASKETBALL OPEN GYM | Monday | 6:00am – 8:00am | Gymnasium A | All levels welcome | Included with membership',

  -- Raw AI output before field mapping — preserved exactly as the model returned it
  '{
    "activity": "Basketball Open Gym",
    "days": ["monday"],
    "time_start": "06:00",
    "time_end": "08:00",
    "location": "Gymnasium A",
    "skill_level": "all_levels",
    "cost": "membership_included",
    "notes": null,
    "confidence": 0.92
  }'::jsonb,

  0.92,   -- High confidence: structured table, single explicit day, stated start and end time
  false,  -- Does not require special review attention — approve after venue is linked
  'pending',
  now()
);


-- ── [2] Wednesday AM Open Gym ─────────────────────────────────────────────────
-- Source: same structured table, but the day cell read "Wed/Fri" — a single
-- row covering two days. The AI split it into two separate candidates
-- (this one + a Friday candidate not shown). The split is an inference,
-- not a direct statement from the source, so confidence drops.
--
-- needs_review = true: reviewer should confirm both days are active and
-- that the times apply identically to Wednesday and Friday.
-- extracted_json reflects the original multi-day AI output — both days
-- are preserved there so the split logic is auditable.

INSERT INTO public.run_candidates (
  venue_id,
  title, sport_id, day_of_week, start_time, end_time,
  skill_level, is_indoor, notes,
  source_url, source_name, source_type,
  raw_text,
  extracted_json,
  confidence_score, needs_review, review_status,
  last_seen_at
)
VALUES (
  NULL,
  'Open Gym Basketball',
  'basketball',
  'wed',
  '06:00',
  '08:00',
  'casual',
  true,

  -- notes carries the ambiguity forward into the live runs row if approved
  'Split from a combined "Wed/Fri" source cell — verify both days apply identically',

  'https://ymca-valleyglen.org/program-schedule',
  'YMCA of Valley Glen',
  'website',

  -- Same verbatim chunk for both the Wednesday and Friday candidates —
  -- this is intentional. The raw_text is the source chunk, not the mapped output.
  'BASKETBALL OPEN GYM | Wed/Fri | 6:00am – 8:00am | Gymnasium A | All levels',

  -- AI returned both days; the field-mapping layer produced two separate rows.
  -- Storing the original multi-day output here preserves the full AI response.
  '{
    "activity": "Basketball Open Gym",
    "days": ["wednesday", "friday"],
    "time_start": "06:00",
    "time_end": "08:00",
    "location": "Gymnasium A",
    "skill_level": "all_levels",
    "split_note": "Source had a single row spanning Wed/Fri — split into separate candidates",
    "confidence": 0.76
  }'::jsonb,

  0.76,   -- Reduced from [1]: split from combined cell is an inference, not explicit
  true,   -- Flagged: reviewer must verify Wednesday is independently accurate
  'pending',
  now()
);


-- ── [3] Tuesday Evening Pickup Basketball ─────────────────────────────────────
-- Source: prose paragraph in the "Community Programs" section — no table.
-- Multiple compounding uncertainties:
--   (a) End time inferred from the venue's general closing time ("to closing"),
--       not stated explicitly. The AI used 21:00 as a best estimate.
--   (b) Source explicitly says "times subject to change."
--   (c) The AI extracted both Tuesday and Thursday from this paragraph;
--       this candidate covers Tuesday only. A mirrored Thursday candidate
--       (not shown) was also inserted with the same confidence and flags.
--
-- needs_review = true: reviewer must call or check the venue's front desk
-- to confirm the exact end time before approving.

INSERT INTO public.run_candidates (
  venue_id,
  title, sport_id, day_of_week, start_time, end_time,
  skill_level, is_indoor, notes,
  source_url, source_name, source_type,
  raw_text,
  extracted_json,
  confidence_score, needs_review, review_status,
  last_seen_at
)
VALUES (
  NULL,
  'Pickup Basketball',
  'basketball',
  'tue',
  '19:00',
  '21:00',     -- Best estimate only — source said "to closing", not 9pm

  'mixed',
  true,

  -- Ambiguity is preserved in notes so it carries into the live run if approved.
  -- A reviewer can correct the end time here before hitting approve.
  'End time is approximate — source stated "to closing", estimated 9pm from venue hours. Times subject to change per source.',

  'https://ymca-valleyglen.org/program-schedule',
  'YMCA of Valley Glen',
  'website',

  -- Verbatim prose from the source
  'Join us for our popular evening pickup basketball games! Usually held Tuesday and Thursday evenings starting around 7pm and running to closing. Please note times are subject to change — check with the front desk for the latest schedule.',

  -- AI output includes all ambiguities in a structured list for the reviewer
  '{
    "activity": "Pickup Basketball",
    "days": ["tuesday", "thursday"],
    "time_start": "19:00",
    "time_end": "21:00",
    "time_end_basis": "inferred_from_venue_hours",
    "skill_level": "mixed",
    "ambiguities": [
      "end_time not stated — inferred from venue closing time",
      "source includes subject-to-change disclaimer",
      "days extracted from prose, not a structured field"
    ],
    "recommended_action": "confirm exact end time before approving",
    "confidence": 0.48
  }'::jsonb,

  0.48,   -- Below 0.5 threshold — high ambiguity in end time and a change disclaimer
  true,   -- Flagged: reviewer must verify end time independently
  'pending',
  now()
);
