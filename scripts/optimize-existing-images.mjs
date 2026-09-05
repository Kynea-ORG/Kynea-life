#!/usr/bin/env node
/**
 * Retroactive image optimization script for Kynea (Supabase Storage).
 *
 * Scans `classes.cover_image` and `profiles.photo_url` for images stored in Supabase Storage,
 * downloads each original image, compresses and converts to WebP via `sharp` (max 1400px, quality 80),
 * uploads with `cacheControl: '31536000'` (1 year), updates the referencing database rows,
 * and removes the old uncompressed files from Storage.
 *
 * Usage:
 *   # Dry-run (scans, measures savings, changes NOTHING):
 *   node scripts/optimize-existing-images.mjs --prod [--limit <n>]
 *   node scripts/optimize-existing-images.mjs --dev [--limit <n>]
 *
 *   # Execute (actually applies changes):
 *   node scripts/optimize-existing-images.mjs --dev --execute
 *   SUPABASE_SERVICE_ROLE_KEY="<prod-key>" node scripts/optimize-existing-images.mjs --prod --execute
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// ── Parse CLI flags ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const EXECUTE = flag('execute');
const IS_DEV = flag('dev');
const IS_PROD = flag('prod');
const DELETE_OLD = !flag('no-delete-old');
const LIMIT = opt('limit') ? parseInt(opt('limit'), 10) : null;
const QUALITY = parseInt(opt('quality', '80'), 10);
const MAX_SIZE = parseInt(opt('max-size', '1400'), 10);
const BUCKET = opt('bucket', 'class-images');

// ── Resolve environment credentials ────────────────────────────────────────────

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
  }
  return vars;
}

const fileEnv = loadEnvFile();

let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (IS_DEV) {
  supabaseUrl = 'https://uibigobubqrolozvrkzd.supabase.co';
  supabaseKey = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYmlnb2J1YnFyb2xvenZya3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzI3OTU2MSwiZXhwIjoyMDk4ODU1NTYxfQ.Zqr5Qb1Yax_GUdawxKp1r-hveSs4Bb-PGf09ZVr2JYM';
} else if (IS_PROD) {
  supabaseUrl = 'https://hmvonvxgmvwfnhlmrgpg.supabase.co';
  let candidateKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.PROD_SUPABASE_SERVICE_ROLE_KEY ||
    fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (candidateKey) {
    try {
      const p = JSON.parse(Buffer.from(candidateKey.split('.')[1], 'base64').toString());
      if (p.ref === 'hmvonvxgmvwfnhlmrgpg') supabaseKey = candidateKey;
    } catch {}
  }
  if (!supabaseKey && !EXECUTE) {
    supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtdm9udnhnbXZ3Zm5obG1yZ3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODQ1MDcsImV4cCI6MjA5NzU2MDUwN30.Rb1sxfgaHt2Jv8GngzEU8nZTk2klj1E0H4zABsJeU50';
  }
} else if (!supabaseUrl) {
  supabaseUrl = fileEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://hmvonvxgmvwfnhlmrgpg.supabase.co';
  supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials.');
  console.error('Please specify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment, or pass --dev / --prod.\n');
  process.exit(1);
}

// Check if execute mode has a valid service role key
if (EXECUTE) {
  try {
    const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString());
    const expectedRef = new URL(supabaseUrl).hostname.split('.')[0];
    if (payload.role !== 'service_role') {
      console.error('\n❌ EXECUTE mode requires a service_role key to update the database and write to Storage.');
      console.error(`Received token with role "${payload.role}". Please pass SUPABASE_SERVICE_ROLE_KEY for ${expectedRef}.\n`);
      process.exit(1);
    }
    if (payload.ref && payload.ref !== expectedRef) {
      console.error(`\n❌ Token mismatch! Key has ref "${payload.ref}" but target URL is "${supabaseUrl}" (${expectedRef}).`);
      console.error('Please provide the matching service role key for this project.\n');
      process.exit(1);
    }
  } catch (err) {
    if (err.message && err.message.includes('EXECUTE mode')) throw err;
  }
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/** Extracts bucket and object path from a Supabase Storage public URL */
function parseStorageUrl(url) {
  if (!url || !url.includes('/storage/v1/object/public/')) return null;
  const parts = url.split('/storage/v1/object/public/');
  if (parts.length < 2) return null;
  const fullSubpath = decodeURIComponent(parts[1].split('?')[0]);
  const slashIdx = fullSubpath.indexOf('/');
  if (slashIdx === -1) return null;
  const bucket = fullSubpath.slice(0, slashIdx);
  const objectPath = fullSubpath.slice(slashIdx + 1);
  return { bucket, objectPath };
}

/** Generates a target .webp path for a given storage path */
function getTargetWebpPath(oldPath) {
  const ext = path.extname(oldPath).toLowerCase();
  const dir = path.dirname(oldPath);
  const baseWithoutExt = path.basename(oldPath, ext);

  if (ext === '.webp') {
    return dir === '.' ? `${baseWithoutExt}_opt.webp` : `${dir}/${baseWithoutExt}_opt.webp`;
  }
  return dir === '.' ? `${baseWithoutExt}.webp` : `${dir}/${baseWithoutExt}.webp`;
}

// ── Main Migration Routine ────────────────────────────────────────────────────

async function main() {
  console.log('\n======================================================');
  console.log('   Kynea — Retroactive Image Optimizer (WebP)');
  console.log('======================================================');
  console.log(`Target URL:     ${supabaseUrl}`);
  console.log(`Bucket:         ${BUCKET}`);
  console.log(`Mode:           ${EXECUTE ? '⚡ EXECUTE (writes to DB & Storage)' : '🔍 DRY-RUN (read-only preview)'}`);
  console.log(`Delete old:     ${EXECUTE && DELETE_OLD ? 'YES' : 'NO'}`);
  console.log(`WebP Quality:   ${QUALITY} | Max Dimension: ${MAX_SIZE}px`);
  if (LIMIT) console.log(`Limit:          ${LIMIT} unique image(s)`);
  console.log('------------------------------------------------------\n');

  // 1. Fetch images from classes
  console.log('Fetching image references from database...');
  const { data: classRows, error: classErr } = await supabase
    .from('classes')
    .select('id, title, cover_image')
    .not('cover_image', 'is', null);

  if (classErr) {
    throw new Error(`Failed to query classes: ${classErr.message}`);
  }

  // 2. Fetch images from profiles
  const { data: profileRows, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, photo_url')
    .not('photo_url', 'is', null);

  if (profErr) {
    throw new Error(`Failed to query profiles: ${profErr.message}`);
  }

  console.log(`Found ${classRows.length} total class(es) and ${profileRows.length} total profile(s).`);

  // 3. Collect unique images belonging to this Supabase project
  const urlMap = new Map();

  for (const c of classRows) {
    if (c.cover_image && c.cover_image.includes(supabaseUrl)) {
      if (!urlMap.has(c.cover_image)) {
        urlMap.set(c.cover_image, { url: c.cover_image, classes: [], profiles: [] });
      }
      urlMap.get(c.cover_image).classes.push(c);
    }
  }

  for (const p of profileRows) {
    if (p.photo_url && p.photo_url.includes(supabaseUrl)) {
      if (!urlMap.has(p.photo_url)) {
        urlMap.set(p.photo_url, { url: p.photo_url, classes: [], profiles: [] });
      }
      urlMap.get(p.photo_url).profiles.push(p);
    }
  }

  const allItems = Array.from(urlMap.values());
  console.log(`Found ${allItems.length} unique Supabase image URL(s) referenced in DB.`);

  // Filter out images that are already webp
  const candidates = allItems.filter(item => {
    const ext = path.extname(item.url.split('?')[0]).toLowerCase();
    return ext !== '.webp';
  });

  const alreadyWebpCount = allItems.length - candidates.length;
  console.log(`  - Already WebP:   ${alreadyWebpCount}`);
  console.log(`  - Need optimizer: ${candidates.length} (PNG / JPG)\n`);

  const toProcess = LIMIT ? candidates.slice(0, LIMIT) : candidates;

  if (toProcess.length === 0) {
    console.log('✅ No unoptimized images found to process. All set!');
    return;
  }

  let totalOriginalBytes = 0;
  let totalCompressedBytes = 0;
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`Processing ${toProcess.length} image(s)...`);
  console.log('------------------------------------------------------');

  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    const indexStr = `[${i + 1}/${toProcess.length}]`;
    const parsed = parseStorageUrl(item.url);

    if (!parsed) {
      console.warn(`${indexStr} ⚠️ Skipping invalid storage URL: ${item.url}`);
      skippedCount++;
      continue;
    }

    const { bucket, objectPath } = parsed;
    const newPath = getTargetWebpPath(objectPath);
    const label = item.classes[0]?.title || item.profiles[0]?.name || objectPath;

    try {
      // Step A: Download original (via fetch for public URLs or storage.download)
      let originalBuffer;
      const res = await fetch(item.url);
      if (!res.ok) {
        throw new Error(`HTTP fetch error ${res.status}: ${res.statusText}`);
      }
      originalBuffer = Buffer.from(await res.arrayBuffer());

      const origSize = originalBuffer.length;
      totalOriginalBytes += origSize;

      // Step B: Compress with sharp
      const compressedBuffer = await sharp(originalBuffer)
        .rotate()
        .resize({
          width: MAX_SIZE,
          height: MAX_SIZE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: QUALITY, effort: 4 })
        .toBuffer();

      const newSize = compressedBuffer.length;
      totalCompressedBytes += newSize;
      const savingsPct = (((origSize - newSize) / origSize) * 100).toFixed(1);

      console.log(
        `${indexStr} "${label.slice(0, 32)}" | ${formatBytes(origSize)} -> ${formatBytes(newSize)} (-${savingsPct}%)`
      );

      // Step C: If EXECUTE is on, upload, update DB, and delete old
      if (EXECUTE) {
        // 1. Upload compressed WebP
        const { error: upErr } = await supabase.storage.from(bucket).upload(newPath, compressedBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        });
        if (upErr) throw new Error(`Upload error: ${upErr.message}`);

        // 2. Get new public URL
        const { data: { publicUrl: newPublicUrl } } = supabase.storage.from(bucket).getPublicUrl(newPath);

        // 3. Update referencing classes
        if (item.classes.length > 0) {
          const { error: dbClassErr } = await supabase
            .from('classes')
            .update({ cover_image: newPublicUrl })
            .eq('cover_image', item.url);
          if (dbClassErr) throw new Error(`DB class update error: ${dbClassErr.message}`);
        }

        // 4. Update referencing profiles
        if (item.profiles.length > 0) {
          const { error: dbProfErr } = await supabase
            .from('profiles')
            .update({ photo_url: newPublicUrl })
            .eq('photo_url', item.url);
          if (dbProfErr) throw new Error(`DB profile update error: ${dbProfErr.message}`);
        }

        // 5. Delete old uncompressed file from Storage
        if (DELETE_OLD && newPath !== objectPath) {
          const { error: rmErr } = await supabase.storage.from(bucket).remove([objectPath]);
          if (rmErr) {
            console.warn(`    ⚠️ Note: could not delete old file "${objectPath}": ${rmErr.message}`);
          }
        }
      }

      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`${indexStr} ❌ FAILED on "${label}": ${err.message}`);
    }
  }

  // ── Final Summary ─────────────────────────────────────────────────────────────

  const totalSaved = totalOriginalBytes - totalCompressedBytes;
  const totalSavedPct = totalOriginalBytes > 0 ? ((totalSaved / totalOriginalBytes) * 100).toFixed(1) : 0;

  console.log('\n======================================================');
  console.log('                 MIGRATION SUMMARY');
  console.log('======================================================');
  console.log(`Status:               ${EXECUTE ? '✅ COMPLETED' : '🔍 DRY-RUN (No files were changed)'}`);
  console.log(`Images processed:     ${successCount} successful, ${errorCount} failed, ${skippedCount} skipped`);
  console.log(`Total original size:  ${formatBytes(totalOriginalBytes)}`);
  console.log(`Total WebP size:      ${formatBytes(totalCompressedBytes)}`);
  console.log(`Total space saved:    ${formatBytes(totalSaved)} (-${totalSavedPct}%)`);
  if (!EXECUTE) {
    console.log('\n💡 To execute these optimizations on disk and database, pass:');
    console.log('   --execute');
  }
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
