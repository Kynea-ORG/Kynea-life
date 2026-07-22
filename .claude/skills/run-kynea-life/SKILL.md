---
name: run-kynea-life
description: Build, run, and drive the kynea-life Next.js app (dev server + Playwright driver). Use when asked to start kynea-life, run its dev server, take a screenshot of a page, or drive the teacher signup/onboarding/crear-clase/publish flow end-to-end against the real kynea-dev Supabase project.
---

This is a Next.js 16 (App Router) web app. Drive it via
`.claude/skills/run-kynea-life/driver.mjs` — a small Playwright CLI
(no `chromium-cli` available in this environment, so this is a
hand-rolled driver instead of the usual heredoc). All paths below are
relative to the repo root.

## Prerequisites

Playwright is a devDependency (already in `package.json`). Chromium
itself must be installed once per machine:

```bash
npx playwright install chromium
```

## Setup

```bash
npm install
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` pointed at the **kynea-dev** Supabase
project (never point this at production — see root `CLAUDE.md`).
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is optional; when unset, the address
field in crear-clase correctly falls back to a plain text input (this
is expected, not a bug — see Gotchas).

## Build

No separate build step for local driving — `next dev` compiles routes
on demand.

## Run (agent path)

Start the dev server in the background and wait for it to actually serve:

```bash
nohup npm run dev > /tmp/kynea-dev.log 2>&1 &
echo $! > /tmp/kynea-dev.pid
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # poll until 200
```

Then drive it with `driver.mjs`. Each command is a **separate process**
— session/auth state persists across them via
`.claude/skills/run-kynea-life/state.json` (Playwright storageState),
written automatically at the end of every command.

```bash
cd .claude/skills/run-kynea-life
node driver.mjs <command> [args...]
```

| command | what it does |
|---|---|
| `signup <role> <email>` | role selection + email/password signup; `role` is `alumno`\|`profesor`\|`academia`. Redirects to `/confirmar-email` on success. |
| `otp <email> <role> <code>` | types the 6-digit code, verifies, lands on `/onboarding?new=1` (profesor/academia) or `/clases` (alumno). |
| `onboarding [--empty-check]` | drives all 4 onboarding steps to completion. With `--empty-check`, also asserts each step's required-field gate blocks an empty submit first (proves the validation, not just the happy path). |
| `crear-clase <title> [--no-photo]` | drives the 4-step class wizard through to Publicar. `--no-photo` stops after the blocked-publish attempt (asserts the cover-image-required error) instead of finishing. |
| `check-clases <title>` | navigates to the public `/clases` page and asserts the title is visible. |
| `goto <path> <shotname>` | generic nav + screenshot, for one-off exploration of any route. |

Screenshots land in `.claude/skills/run-kynea-life/screenshots/`.

**A real account requires a real email round-trip.** Signup only
succeeds if `kynea-dev`'s SMTP can actually deliver — see Gotchas
below for the Resend restriction. In practice this means: run
`signup`, ask a human for the OTP code that arrives in their inbox,
then run `otp` with it. This driver cannot read email itself.

Example full run (after a human confirms which email you may use):

```bash
node driver.mjs signup profesor <verified-email>
# … human reads the 6-digit code from their inbox …
node driver.mjs otp <verified-email> profesor <code>
node driver.mjs onboarding --empty-check
node driver.mjs crear-clase "Salsa Smoke Test" --no-photo   # confirms the block
node driver.mjs crear-clase "Salsa Smoke Test"              # confirms it publishes
node driver.mjs check-clases "Salsa Smoke Test"
```

Stop the server with `kill $(cat /tmp/kynea-dev.pid)`.

## Run (human path)

```bash
npm run dev   # → http://localhost:3000, Ctrl-C to stop
```

## Test

```bash
npm run test        # Vitest — unit tests, no browser needed
npm run lint
npx tsc --noEmit
```

---

## Gotchas

- **Supabase's default email (Resend `resend.dev` domain) can only
  send to the Supabase project owner's own verified email address.**
  Any signup to a different/fake address (e.g. `test@example.com`)
  gets a `403` from Resend, which Supabase surfaces as a generic
  `500 {"code":"unexpected_failure","message":"Error sending
  confirmation email"}` on `signUp()`. There is no code-level
  workaround — either use the verified owner email for driver-based
  signup tests, or configure a real custom SMTP domain in the
  `kynea-dev` Supabase dashboard.
- **Gmail `+alias` tricks do NOT bypass the Resend restriction above.**
  `owner+test123@gmail.com` still gets rejected — Resend compares the
  literal string against the one verified address, it doesn't know
  about `+`-aliasing. Use the exact verified address.
- **Re-signing-up an already-CONFIRMED email sends nothing.** Supabase's
  email-enumeration protection makes `signUp()` return success-shaped
  (no error, redirects normally) for an existing confirmed account,
  but silently skips sending any email. If `otp` never gets a real
  code to work with, the test account probably needs to be deleted
  first (Supabase dashboard → Authentication → Users) before a fresh
  `signup` will actually trigger a new email.
- **Checking the terms checkbox via `label:has-text("Acepto los")`
  silently fails** — Playwright's click lands inside the nested
  `<a>Términos y condiciones</a>` link instead of toggling the
  checkbox. Use `page.check('input[type="checkbox"]')` directly.
- **`newContext({ storageState: <path> })` throws `ENOENT` if the file
  doesn't exist yet** (first run, before any command has saved state).
  Guard with `fs.existsSync` and omit the option entirely rather than
  passing an unconditional path — see `driver.mjs`'s `withPage()`.
- **The crear-clase address field is a real `PlaceAutocompleteElement`
  when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set, but a plain `<input
  placeholder="Av. Benavides 1234, piso 3">` when it's unset.** Without
  a key configured (the common case for a fresh dev environment), drive
  it as a plain input — this is the app's intended graceful-degradation
  path, not a bug to work around.
- **Writes against the real `kynea-dev` Supabase project are slower
  than a mocked backend.** `waitForTimeout` after a submit/publish
  needs real headroom (the driver uses 3–4s) — cutting it short
  captures a screenshot mid-"Guardando…"/"Rendering…" state that looks
  like a hang but isn't; re-navigate and check the actual outcome
  before concluding something failed.
- **macOS has no GNU `timeout`.** If adapting the poll-for-ready
  snippet on macOS, drop `timeout N bash -c '...'` and just loop with
  `curl` directly (as done above) — `timeout` isn't a builtin there.

## Troubleshooting

- **`Error: ENOENT: ... state.json`** on the very first driver command
  ever run: expected on a truly fresh checkout before `signup` has run
  once. Not a bug — just run `signup` first.
- **`crear-clase` publish appears to hang / URL doesn't change**: it
  probably already succeeded server-side — the screenshot just landed
  mid-transition. Run `goto /dashboard/mis-clases <name>` and check the
  class's status column before assuming a failure.
