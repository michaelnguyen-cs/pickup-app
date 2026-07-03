-- Phase 3.5: age confirmation gate on profiles
-- Adds age_confirmed flag. Default false so existing rows require explicit confirmation.
-- Set to true by the app after the user checks the age-gate screen.
-- Backend enforcement (RLS policy on run creation) will be added in the backend phase.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_confirmed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.age_confirmed IS
  'True once the user has explicitly confirmed they are 16 or older. '
  'Required before creating or joining runs. Set by the AgeConfirmScreen flow.';
