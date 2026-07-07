-- Table-level privileges for the PostgREST API roles.
--
-- schema.sql never included these explicitly: on the original shared project
-- they came from Supabase's "automatically expose new tables" default-grant
-- behavior (a project-level setting, not SQL), so it was invisible to the
-- concatenation-diff proof. Any fresh project created with that setting off
-- (as recommended for explicit, reviewable access control) needs these grants
-- applied by hand. RLS policies still gate access at the row level.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
-- smoke test: no-op comment, confirms CI wiring works --
