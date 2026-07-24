#!/usr/bin/env node
// One-off migration tool: copies every object in a Supabase Storage bucket
// from one project to another (kynea-dev -> kynea-prd), since a Postgres
// dump/restore only carries storage.objects METADATA, not the actual file
// bytes (those live in Supabase's S3-backed storage, outside Postgres).
//
// Usage:
//   SOURCE_SUPABASE_URL=... SOURCE_SERVICE_ROLE_KEY=... \
//   TARGET_SUPABASE_URL=... TARGET_SERVICE_ROLE_KEY=... \
//   node scripts/migrate-storage.mjs [--bucket class-images] [--execute] [--overwrite]
//
// Defaults to a dry run (lists what WOULD be copied, copies nothing) unless
// --execute is passed — this writes into the target project's real storage,
// treat it with the same care as a prod deploy.
//
// Service role keys are required (not the anon key): reading/writing across
// user folders bypasses per-user Storage RLS by design here, since this is a
// one-time admin migration, not a request made on a user's behalf.

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BUCKET = opt('bucket', 'class-images');
const EXECUTE = flag('execute');
const OVERWRITE = flag('overwrite');

const {
  SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY,
  TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY,
} = process.env;

for (const [name, value] of Object.entries({
  SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY, TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY,
})) {
  if (!value) {
    console.error(`Missing env var ${name}. See usage in this file's header.`);
    process.exit(1);
  }
}

const source = createClient(SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY);
const target = createClient(TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY);

// Storage's list() is not recursive and doesn't distinguish files from
// folders in its return shape (a "folder" entry has `id: null`) — walk
// prefixes depth-first to collect every real file path in the bucket.
// Class covers and profile photos both live under `<user-id>/<file>`
// (see lib/classes/imageActions.ts, PerfilClient.tsx), but this doesn't
// assume a fixed depth in case that ever changes.
async function listAllPaths(client, prefix = '') {
  const paths = [];
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list(${prefix || '/'}) failed: ${error.message}`);
  for (const entry of data ?? []) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // Folder placeholder — recurse.
      paths.push(...await listAllPaths(client, fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

async function main() {
  console.log(`Listing objects in "${BUCKET}" on source...`);
  const sourcePaths = await listAllPaths(source);
  console.log(`Found ${sourcePaths.length} object(s) in source.`);

  if (!EXECUTE) {
    console.log('\nDRY RUN (pass --execute to actually copy). Would copy:');
    for (const p of sourcePaths) console.log(`  ${p}`);
    return;
  }

  console.log(`Listing objects in "${BUCKET}" on target to skip existing...`);
  const targetPaths = OVERWRITE ? new Set() : new Set(await listAllPaths(target));

  let copied = 0, skipped = 0, failed = 0;
  for (const path of sourcePaths) {
    if (targetPaths.has(path)) {
      skipped++;
      continue;
    }
    try {
      const { data: blob, error: downloadError } = await source.storage.from(BUCKET).download(path);
      if (downloadError) throw downloadError;
      const { error: uploadError } = await target.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type || undefined,
        upsert: OVERWRITE,
      });
      if (uploadError) throw uploadError;
      copied++;
      console.log(`  copied: ${path}`);
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${path} — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone. Copied ${copied}, skipped ${skipped} (already in target), failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
