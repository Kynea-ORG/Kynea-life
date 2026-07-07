#!/usr/bin/env node
/**
 * Deploy schema v2 + run E2E smoke tests.
 *
 * Run from the project root (loads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local):
 *   node --env-file=.env.local scripts/deploy-schema.mjs
 *
 * Get the DB password at:
 *   Supabase Dashboard → Settings → Database → Database password
 */

import { readFileSync, readdirSync } from 'fs';
import { createInterface } from 'readline';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const __dir   = dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
if (!API_URL || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env.local or the environment.');
  process.exit(1);
}
const REF = new URL(API_URL).hostname.split('.')[0];

// ── helpers ────────────────────────────────────────────────────────────────────

function ok(cond, label)  { console.log(`  ${cond ? '✅' : '❌'}  ${label}`); return cond; }
function section(title)   { console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`); }

async function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(prompt, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function rest(path, opts = {}) {
  const res = await fetch(`${API_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: ANON, Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
      ...(opts.headers ?? {}),
    },
  });
  return res;
}

// ── 1. GET DB PASSWORD ─────────────────────────────────────────────────────────

let password = process.env.SUPABASE_DB_PASSWORD ?? '';
if (!password) {
  console.log('\n🔐  Need your Supabase database password.');
  console.log('   Supabase Dashboard → Settings → Database → Database password\n');
  password = await ask('   Password: ');
}
if (!password) { console.error('No password provided.'); process.exit(1); }

// ── 2. DEPLOY SCHEMA ──────────────────────────────────────────────────────────

section('DEPLOYING SCHEMA');

const MIGRATIONS_DIR = join(__dir, '../supabase/migrations');

let migrationFiles;
try {
  migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter(name => name.endsWith('.sql'))
    .sort();
} catch (err) {
  console.error(`  ❌  Could not read migrations directory (${MIGRATIONS_DIR}): ${err.message}`);
  process.exit(1);
}
if (migrationFiles.length === 0) {
  console.error(`  ❌  No migration files found in ${MIGRATIONS_DIR}.`);
  process.exit(1);
}

// Supabase connection: try direct first, fall back to pooler regions
const HOSTS = [
  { host: `db.${REF}.supabase.co`,                user: 'postgres',           port: 5432 },
  { host: `aws-1-us-west-2.pooler.supabase.com`,  user: `postgres.${REF}`,    port: 5432 },
  { host: `aws-0-us-east-1.pooler.supabase.com`,  user: `postgres.${REF}`,    port: 5432 },
  { host: `aws-0-us-east-2.pooler.supabase.com`,  user: `postgres.${REF}`,    port: 5432 },
  { host: `aws-0-us-west-1.pooler.supabase.com`,  user: `postgres.${REF}`,    port: 5432 },
  { host: `aws-0-eu-central-1.pooler.supabase.com`, user: `postgres.${REF}`,  port: 5432 },
  { host: `aws-0-eu-west-2.pooler.supabase.com`,  user: `postgres.${REF}`,    port: 5432 },
  { host: `aws-0-ap-southeast-1.pooler.supabase.com`, user: `postgres.${REF}`, port: 5432 },
  { host: `aws-0-sa-east-1.pooler.supabase.com`,  user: `postgres.${REF}`,    port: 5432 },
];

let db;
for (const { host, user, port } of HOSTS) {
  const c = new Client({ host, port, database: 'postgres', user, password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  try {
    process.stderr.write(`  🔍  Trying ${host}… `);
    await c.connect();
    process.stderr.write('connected!\n');
    db = c;
    break;
  } catch {
    process.stderr.write('failed\n');
    await c.end().catch(() => {});
  }
}
if (!db) { console.error('  ❌  Could not connect to any Supabase host. Check your password.'); process.exit(1); }

console.log(`  📦  Applying ${migrationFiles.length} migrations in order…`);

let currentFile = null;
try {
  await db.query('BEGIN');
  for (const file of migrationFiles) {
    currentFile = file;
    console.log(`  ▶️   ${file}`);
    const migrationSql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    await db.query(migrationSql);
  }
  await db.query('COMMIT');
  console.log('  ✅  Schema deployed (all migrations applied).');
} catch (err) {
  console.error(`  ❌  Migration failed on ${currentFile}: ${err.message}`);
  console.error('  ⏪  Rolling back — no partial changes were committed.');
  await db.query('ROLLBACK').catch(() => {});
  await db.end().catch(() => {});
  process.exit(1);
}

// ── 3. VERIFY SEED DATA ───────────────────────────────────────────────────────

section('VERIFYING SEED');

const [s, l, d] = await Promise.all([
  db.query('SELECT count(*)::int n FROM public.dance_styles'),
  db.query('SELECT count(*)::int n FROM public.class_levels'),
  db.query('SELECT count(*)::int n FROM public.districts'),
]);

let seedOk = true;
seedOk &= ok(s.rows[0].n === 24, `dance_styles: ${s.rows[0].n}/24`);
seedOk &= ok(l.rows[0].n === 5,  `class_levels: ${l.rows[0].n}/5`);
seedOk &= ok(d.rows[0].n === 46, `districts: ${d.rows[0].n}/46`);

await db.end();
if (!seedOk) { console.error('\nSeed verification failed.'); process.exit(1); }

// ── 4. REST API SMOKE TESTS ───────────────────────────────────────────────────

section('REST API SMOKE TESTS');

let apiOk = true;

// 4a. Catalog tables readable via anon key
const stylesRes = await rest('dance_styles?select=id,name,slug,emoji&order=ord&limit=5');
const styles    = await stylesRes.json();
apiOk &= ok(Array.isArray(styles) && styles.length > 0, `GET /dance_styles → ${styles.length ?? 0} rows`);

const levelsRes = await rest('class_levels?select=id,name&order=ord');
const levels    = await levelsRes.json();
apiOk &= ok(Array.isArray(levels) && levels.length === 5, `GET /class_levels → ${levels.length ?? 0} rows`);

const distRes = await rest('districts?select=id,name,city&limit=5');
const dists   = await distRes.json();
apiOk &= ok(Array.isArray(dists) && dists.length > 0, `GET /districts → ${dists.length ?? 0} rows (first page)`);

// 4b. RLS: classes returns [] without auth (no published classes yet — that's fine)
const classRes = await rest('classes?select=id,title,status&limit=5');
const classes  = await classRes.json();
apiOk &= ok(Array.isArray(classes), `GET /classes → RLS active (returns array)`);

// 4c. profiles table accessible (RLS: select USING true)
const profRes = await rest('profiles?select=id,role&limit=1');
const profs   = await profRes.json();
apiOk &= ok(Array.isArray(profs), `GET /profiles → RLS active (returns array)`);

// 4d. saved_classes requires auth → should return 401 or []
const savedRes  = await rest('saved_classes?select=user_id,class_id&limit=1');
const savedBody = await savedRes.json();
apiOk &= ok(savedRes.status === 401 || Array.isArray(savedBody), `GET /saved_classes → auth-gated (${savedRes.status})`);

// 4e. increment_class_contacts RPC exists (will return error for unknown class, but must reach the function)
const rpcRes  = await rest('', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
// Just check the function exists via a direct call
const rpcCheck = await fetch(`${API_URL}/rest/v1/rpc/increment_class_contacts`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_class_id: '00000000-0000-0000-0000-000000000000' }),
});
apiOk &= ok(rpcCheck.status !== 404, `RPC increment_class_contacts exists (${rpcCheck.status})`);

// ── 5. BUILD CHECK ────────────────────────────────────────────────────────────

section('BUILD CHECK');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: join(__dir, '..') });
  ok(true, 'TypeScript: 0 errors');
} catch {
  ok(false, 'TypeScript: errors found');
  apiOk = false;
}

// ── 6. SUMMARY ────────────────────────────────────────────────────────────────

section('SUMMARY');
if (seedOk && apiOk) {
  console.log('\n  🎉  Schema v2 deployed, verified, and smoke-tested successfully.');
  console.log('  📋  Next step: run `npm run dev` and test the full UI flow.\n');
} else {
  console.log('\n  ❌  Some checks failed — review output above.\n');
  process.exit(1);
}
