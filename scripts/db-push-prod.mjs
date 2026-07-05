#!/usr/bin/env node
/**
 * Safety-gated `supabase db push` against the shared production project.
 *
 * Confirms the CLI is actually linked to the production ref (not kynea-dev
 * or some other project) and requires typing the ref back before pushing —
 * `supabase db push` alone doesn't say which project it's about to touch.
 *
 * Run from the project root:
 *   npm run db:push:prod
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const PROD_REF = 'hmvonvxgmvwfnhlmrgpg';

let linkedRef = '';
try {
  linkedRef = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
} catch {
  console.error('❌  No project is linked. Run `npm run db:link:prod` first.');
  process.exit(1);
}

if (linkedRef !== PROD_REF) {
  console.error(`❌  Linked project (${linkedRef}) is not production (${PROD_REF}).`);
  console.error('   Run `npm run db:link:prod` first, then retry.');
  process.exit(1);
}

console.log(`⚠️   This will push migrations to the PRODUCTION project (${PROD_REF}).`);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise(resolve => {
  rl.question(`   Type the project ref to confirm: `, a => { rl.close(); resolve(a.trim()); });
});

if (answer !== PROD_REF) {
  console.error('❌  Confirmation did not match. Aborted, nothing was pushed.');
  process.exit(1);
}

execSync('supabase db push', { stdio: 'inherit' });
