#!/usr/bin/env node
// Playwright driver for kynea-life (Next.js). No chromium-cli in this
// environment, so this is a hand-rolled subcommand-based driver — see
// SKILL.md for the verified end-to-end sequence.
//
// Usage: node driver.mjs <command> [args...]
//   signup <role> <email>              role: alumno|profesor|academia
//   otp <email> <role> <code>
//   onboarding [--empty-check]         drives all 4 steps to completion;
//                                      --empty-check also asserts each
//                                      step's required-field gate blocks
//                                      an empty submit first
//   crear-clase <title> [--no-photo]   --no-photo stops after the blocked
//                                      publish attempt (does not finish)
//   check-clases <title>
//   goto <path> <shotname>             generic nav + screenshot, for
//                                      one-off exploration
//
// State (auth session) persists across invocations via state.json in this
// directory — each command is a separate `node` process.

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(DIR, 'state.json');
const SHOTS = path.join(DIR, 'screenshots');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

function tomorrow() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

async function withPage(fn) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const hasState = !process.env.NO_STATE && fs.existsSync(STATE);
  const context = await browser.newContext(hasState ? { storageState: STATE } : {});
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('response', async res => {
    if (res.status() >= 400 && res.url().includes('supabase')) {
      let body = ''; try { body = await res.text(); } catch {}
      console.log(`[HTTP ${res.status()}] ${res.url()}\n  body: ${body}`);
    }
  });
  try {
    await fn(page);
  } finally {
    await context.storageState({ path: STATE });
    console.log('CONSOLE ERRORS:', JSON.stringify(errors));
    console.log('FINAL URL:', page.url());
    await browser.close();
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  console.log(`[shot] ${name}`);
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'login') {
  const [email, password] = args;
  if (!email || !password) { console.error('usage: login <email> <password>'); process.exit(1); }
  await withPage(async page => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="tu@correo.com"]', email);
    await page.fill('input[placeholder="Tu contraseña"]', password);
    await page.click('button[type="submit"]:has-text("Iniciar sesión")');
    await page.waitForTimeout(3000);
    await shot(page, '00-post-login');
  });

} else if (cmd === 'signup') {
  const [role, email] = args;
  const roleLabel = { alumno: 'Alumno', profesor: 'Profesor', academia: 'Academia' }[role];
  if (!roleLabel) { console.error('role must be alumno|profesor|academia'); process.exit(1); }
  await withPage(async page => {
    await page.goto(`${BASE}/registro`, { waitUntil: 'networkidle' });
    await page.click(`button:has-text("${roleLabel}")`);
    await page.check('input[type="checkbox"]'); // NOT label:has-text(...) — see Gotchas
    await page.click(`button:has-text("Continuar como ${roleLabel} con correo")`);
    await page.waitForSelector(`text=Cuenta de ${roleLabel}`);
    await page.fill('input[placeholder="Tu nombre"], input[placeholder="Ej. Studio Ritmo Latino"]', 'Profesor Prueba QA');
    await page.fill('input[placeholder="tu@correo.com"]', email);
    await page.fill('input[placeholder="Mínimo 8 caracteres"]', 'TestPassword123!');
    await shot(page, '01-registro-filled');
    await page.click('button[type="submit"]:has-text("Crear cuenta")');
    await page.waitForTimeout(3000);
    await shot(page, '02-post-signup');
  });

} else if (cmd === 'otp') {
  const [email, role, code] = args;
  if (!email || !role || !code) { console.error('usage: otp <email> <role> <code>'); process.exit(1); }
  await withPage(async page => {
    await page.goto(`${BASE}/confirmar-email?email=${encodeURIComponent(email)}&role=${role}`, { waitUntil: 'networkidle' });
    const firstBox = page.locator('input[type="text"][inputmode="numeric"]').first();
    await firstBox.click();
    await firstBox.type(code, { delay: 50 }); // typing the full code auto-fills all 6 boxes and auto-submits
    await page.waitForTimeout(3000);
    await shot(page, '03-post-otp');
  });

} else if (cmd === 'onboarding') {
  const checkEmpty = args.includes('--empty-check');
  await withPage(async page => {
    await page.goto(`${BASE}/onboarding?new=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Tus datos públicos', { timeout: 15000 });

    if (checkEmpty) {
      await page.click('button:has-text("Continuar")');
      await page.waitForTimeout(500);
      console.log('step0 empty-submit errors:', JSON.stringify(await page.locator('.text-red-600').allTextContents()));
      await shot(page, '04-onboarding-step0-blocked');
    }

    // Step 0 (Datos públicos): publicName comes prefilled from signup;
    // Nacionalidad is the only select on this step (no Ciudad/Distrito —
    // location moved fully to Google Places on venues, not onboarding).
    await page.locator('select').first().selectOption({ index: 1 });
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);

    if (checkEmpty) {
      await page.click('button:has-text("Continuar")');
      await page.waitForTimeout(500);
      console.log('step1 empty-submit errors:', JSON.stringify(await page.locator('.text-red-600').allTextContents()));
      await shot(page, '05-onboarding-step1-blocked');
    }
    // Step 1 (Contacto): requires WhatsApp OR Instagram (not both) — fill WhatsApp.
    await page.fill('input[placeholder="999 999 999"]', '987654321');
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);

    if (checkEmpty) {
      await page.click('button:has-text("Continuar")');
      await page.waitForTimeout(500);
      console.log('step2 empty-submit errors:', JSON.stringify(await page.locator('.text-red-600').allTextContents()));
      await shot(page, '06-onboarding-step2-blocked');
    }
    const styleButtons = page.locator('button').filter({ hasText: /^(Salsa|Bachata|Reggaeton|Kizomba|Hip Hop|Heels|Twerk|Merengue)/ });
    await styleButtons.first().click();
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);
    await shot(page, '07-onboarding-step3-review');

    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Guardar y entrar")');
    await page.waitForTimeout(4000); // real Supabase write — slower than a mock
    await shot(page, '08-onboarding-done');
  });

} else if (cmd === 'crear-clase') {
  const [title, ...rest] = args;
  const noPhoto = rest.includes('--no-photo');
  // Blocks the Google Maps script so PlacesAddressField falls back to the
  // plain-<input> path with manual Ciudad/Distrito fields — exercises the
  // fallback UI (see CrearClaseForm.tsx addressFallback) instead of the
  // live Google widget.
  const noMaps = rest.includes('--no-maps');
  if (!title) { console.error('usage: crear-clase <title> [--no-photo] [--no-maps]'); process.exit(1); }
  await withPage(async page => {
    if (noMaps) await page.route('https://maps.googleapis.com/**', route => route.abort());
    await page.goto(`${BASE}/dashboard/crear-clase`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Título de la clase', { timeout: 15000 });

    await page.fill('input[placeholder="Ej: Salsa Básico desde cero"]', title);
    const s0 = page.locator('select');
    await s0.nth(0).selectOption({ index: 1 }); // estilo
    await s0.nth(1).selectOption({ index: 1 }); // nivel

    if (!noPhoto) {
      // logo.png is 351×118px — below the app's 400×400px minimum-cover-size
      // validation. img-portada-kynea.png (3508×2480) clears it.
      await page.setInputFiles('input[type="file"]', path.join(DIR, '..', '..', '..', 'public', 'img-portada-kynea.png'));
      // Real ~1.2MB upload to Supabase Storage — wait for the "Subiendo
      // imagen…" placeholder to appear, then disappear. waitForSelector
      // with state:'hidden' alone races: if called before the placeholder
      // ever mounts, 0 matches already satisfies "hidden" and resolves
      // instantly while the upload is still in flight.
      await page.waitForSelector('text=Subiendo imagen', { state: 'visible', timeout: 5000 }).catch(() => {});
      await page.waitForSelector('text=Subiendo imagen', { state: 'hidden', timeout: 20000 });
    }
    await shot(page, '09-crear-clase-step0');
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);

    if (noPhoto) {
      // Cover image is required — without it, Continuar should block on step 0.
      console.log('step0 (no-photo) errors:', JSON.stringify(await page.locator('.text-red-600').allTextContents()));
      await shot(page, '09b-crear-clase-no-photo-blocked');
      return;
    }

    await page.click('button:has-text("Clase única")');
    await page.fill('input[type="date"]', tomorrow());
    // Presencial is the default modality already — no click needed.
    if (noMaps) {
      // Fallback forced via blocked script -> plain <input> + manual
      // Ciudad/Distrito (addressFallback).
      await page.locator('input[placeholder="Ej: Miraflores"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('input[placeholder="Ej: Av. Benavides 1234, piso 3"]').fill('Av. Benavides 1234, San Isidro');
      await page.locator('input[placeholder="Ej: Miraflores"]').fill('San Isidro');
      // Ciudad already defaults to "Lima" (buildInitialForm) — leave as-is.
    } else {
      // This env has a real NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, so
      // PlacesAddressField mounts the live Google PlaceAutocompleteElement
      // (gmp-place-autocomplete). Its internal <input> lives in a CLOSED
      // shadow root — Playwright's CSS piercing can't reach it, so click
      // the host element to delegate focus, then drive it via keyboard.
      // Publishing REQUIRES selecting a real prediction (city/district only
      // come from Google's response) — typed-but-unselected text blocks at
      // publish time with "No se pudo determinar la ciudad…". NOTE: if this
      // key is referrer-restricted for the current domain (e.g. localhost
      // in dev), every prediction request 403s and there's nothing to
      // select — use `--no-maps` instead to test the fallback path, which
      // is what PlacesAddressField itself falls back to via 'gmp-error' in
      // that exact scenario.
      await page.waitForTimeout(2500); // Google Maps script + custom element mount
      await page.click('gmp-place-autocomplete');
      await page.keyboard.type('Av. Benavides 1234, San Isidro, Lima', { delay: 50 });
      await page.waitForTimeout(1500); // live predictions request
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000); // fetchFields() round-trip
    }
    await shot(page, '10-crear-clase-step1');

    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Gratis")');
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);
    await shot(page, '11-crear-clase-review');

    await page.click('button:has-text("Publicar clase")');
    // Real Supabase write (class + venue rows) — needs more than a couple
    // seconds against the live dev project, unlike a mocked backend.
    await page.waitForTimeout(4000);
    await shot(page, '12-crear-clase-after-publish');
    console.log('errors after publish attempt:', JSON.stringify(await page.locator('.text-red-600').allTextContents()));
  });

} else if (cmd === 'crear-clase-multi') {
  // One-off verification for the multi-slot schedule editor fix: creates a
  // "Mensual" draft with 2 distinct day+time blocks via "Agregar otro
  // horario", saves as draft, then reopens the edit form and screenshots the
  // schedule step to confirm BOTH blocks render (not just the first).
  const [title] = args;
  if (!title) { console.error('usage: crear-clase-multi <title>'); process.exit(1); }
  await withPage(async page => {
    await page.goto(`${BASE}/dashboard/crear-clase`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Título de la clase', { timeout: 15000 });

    await page.fill('input[placeholder="Ej: Salsa Básico desde cero"]', title);
    const s0 = page.locator('select');
    await s0.nth(0).selectOption({ index: 1 });
    await s0.nth(1).selectOption({ index: 1 });
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Mensual")');
    await page.fill('input[type="date"]', tomorrow());

    // Slot 1 — Lunes 19:00-20:30 (defaults)
    await page.click('button:has-text("Lun")');

    // Add a second block — Miércoles 20:00-21:00
    await page.click('button:has-text("Agregar otro horario")');
    await page.waitForTimeout(200);
    const dayButtons = page.locator('button').filter({ hasText: /^Mié$/ });
    await dayButtons.nth(1).click(); // index 0 = slot 1's "Mié" pill, index 1 = slot 2's
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(2).fill('20:00'); // slot 2 start
    await timeInputs.nth(3).fill('21:00'); // slot 2 end
    await shot(page, '20-crear-clase-multi-step1');

    await page.click('button:has-text("Presencial")');
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="Av. Benavides 1234, piso 3"]').fill('Av. Benavides 1234, San Isidro');
    for (const sel of await page.locator('select').all()) {
      const opts = await sel.locator('option').allTextContents();
      if (opts.some(o => o.includes('Lima') || o.includes('Arequipa'))) await sel.selectOption({ index: 0 });
    }
    const districtSelect = page.locator('select').filter({ hasText: 'Seleccionar distrito' });
    if (await districtSelect.count()) await districtSelect.selectOption({ index: 1 });

    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Gratis")');
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Guardar borrador")');
    await page.waitForTimeout(4000);
    await shot(page, '21-crear-clase-multi-after-save');
    console.log('FINAL URL after save:', page.url());
  });

} else if (cmd === 'reopen-edit-schedule') {
  // Navigates to mis-clases, opens the most recent draft matching `title`
  // for editing, jumps to the schedule step, and screenshots it — to verify
  // both time blocks survive a save + reload round trip.
  const [title] = args;
  if (!title) { console.error('usage: reopen-edit-schedule <title>'); process.exit(1); }
  await withPage(async page => {
    await page.goto(`${BASE}/dashboard/mis-clases`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const card = page.locator(`text=${title}`).first();
    await card.waitFor({ timeout: 15000 });
    const editLink = page.locator('a[href*="/dashboard/crear-clase?edit="]').filter({ has: page.locator(`text=${title}`) });
    let href = null;
    if (await editLink.count()) {
      href = await editLink.first().getAttribute('href');
    } else {
      // Fallback: find the class card container and look for the edit link inside it
      const container = card.locator('xpath=ancestor::*[self::div or self::li][1]');
      href = await container.locator('a[href*="/dashboard/crear-clase?edit="]').first().getAttribute('href');
    }
    console.log('edit href:', href);
    await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Título de la clase', { timeout: 15000 });
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(500);
    await shot(page, '22-reopen-edit-schedule-step1');
    const blockCount = await page.locator('text=/^Horario \\d+$/').count();
    console.log('visible schedule block headers:', blockCount);
    const dayPills = await page.locator('p:has-text("Los ") + p, p.bg-white').allTextContents();
    console.log('slot summaries:', JSON.stringify(dayPills));
  });

} else if (cmd === 'check-clases') {
  const [title] = args;
  await withPage(async page => {
    await page.goto(`${BASE}/clases`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await shot(page, '13-clases-public');
    console.log('Class visible:', (await page.locator(`text=${title}`).count()) > 0);
  });

} else if (cmd === 'goto') {
  const [urlPath, name] = args;
  await withPage(async page => {
    await page.goto(`${BASE}${urlPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, name ?? 'adhoc');
  });

} else {
  console.error('Unknown command. See SKILL.md for the command list.');
  process.exit(1);
}
