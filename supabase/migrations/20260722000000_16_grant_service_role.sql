-- 16. GRANT service_role — table-level privileges were only ever given to
-- anon/authenticated (13_grants.sql). service_role bypasses RLS but still
-- needs the underlying GRANTs to reach PostgREST/Admin-API tables at all,
-- so any service_role-backed script or Edge Function was silently unable
-- to read/write public schema tables. Mirrors the authenticated grants.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
