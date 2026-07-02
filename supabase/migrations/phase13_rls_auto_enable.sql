-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 13: Document the rls_auto_enable event trigger (already live)
--
-- DOCUMENTATION ONLY — DO NOT RUN THIS FILE.
--
-- The Batch 4 database audit found an event trigger (`ensure_rls`) and its
-- handler function (`rls_auto_enable`) already present on the live Pick-Up
-- project. Neither was defined in any file under supabase/migrations/ or
-- schema.sql — they were created directly against the database outside
-- version control, so the migration files alone could not reconstruct the
-- live database from scratch.
--
-- What it does: on CREATE TABLE / CREATE TABLE AS / SELECT INTO in the
-- `public` schema, it automatically runs
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on the new table. This is why
-- every table audited in Batch 4 already had RLS enabled without an explicit
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY statement in its own migration.
--
-- The SQL below is copied verbatim from `pg_get_functiondef()` and
-- `pg_event_trigger` on the live project (queried 2026-07-02). It is
-- captured here so the repo reflects the true state of the database, not so
-- it can be (re-)applied — applying it would attempt to recreate an object
-- that already exists.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- evtenabled = 'O': fires in "origin" and "local" session_replication_role
-- modes — the default enabled state.
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
