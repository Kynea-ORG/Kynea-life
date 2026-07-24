# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Documentation

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — project/domain context and full database schema overview
- [`docs/TASKS.md`](docs/TASKS.md) — dev handoff and open work
- [`docs/BUGS.md`](docs/BUGS.md) — known bugs
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — Vercel deploy and database migration flow
- [`docs/HOTFIX.md`](docs/HOTFIX.md) — emergency branch-protection bypass procedure
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — PR/branch/review workflow for the team

## Opening pull requests

**Every PR in this repo MUST be authored by the bot account `joseniquen08-pr`, never by `joseniquen08` (the human account `gh` is normally logged in as on this machine).** This is not optional — see `docs/WORKFLOW.md`: CODEOWNERS requires `@joseniquen08`'s own approval on `lib/`, `supabase/`, and `proxy.ts` changes, and GitHub blocks a PR author from approving their own PR. If the PR is authored by `joseniquen08`, it becomes unapprovable and has to be closed and reopened under the bot account — do not let this happen.

Do **not** run `gh auth login` or `gh auth switch` to change the machine's default account for this — the bot token lacks the `read:org` scope that `gh auth login` demands, so that flow fails. Instead, pass the token via `GH_TOKEN` for the specific command only, leaving the machine's stored `gh` session (`joseniquen08`, used for reviews/reads) untouched:

```bash
GH_TOKEN=$(cat ~/.kynea-bot-token) gh pr create --repo Kynea-ORG/Kynea-life ...
```

The token lives at `~/.kynea-bot-token` (outside this repo — never print/echo its contents, pipe it directly). Verify identity before creating a PR if unsure: `GH_TOKEN=$(cat ~/.kynea-bot-token) gh api user --jq .login` must print `joseniquen08-pr`.

This applies to every `gh pr create` call, regardless of session, memory, or prior context — treat it as a hard rule of this repo, not a one-off preference.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint (Next.js core-web-vitals + TypeScript rules)
```

No test suite is configured.

## Environment

Requires a `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

The template for these variables lives in `.env.example` — copy it to `.env.local` and fill in the values.

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (@supabase/ssr).

### Next.js 16 breaking changes in this repo

- **Middleware is renamed to Proxy.** The file is `proxy.ts` (not `middleware.ts`) and the exported function must be named `proxy` (not `middleware`). See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **`cookies()` is async** in Next.js 16 — must be `await cookies()`. Already handled in `lib/supabase/server.ts`.

### Data layer

Feature-sliced under `lib/`, not a single flat `queries`/`actions` pair:

| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | Server-side Supabase client (RSC / Server Actions / Route Handlers) |
| `lib/supabase/client.ts` | Browser Supabase client (Client Components) |
| `lib/types.ts` | Shared domain types |
| `lib/auth/actions.ts`, `lib/auth/redirectByRole.ts` | `'use server'` auth mutations + post-login/onboarding redirect by profile role |
| `lib/catalog/queries.ts`, `lib/catalog/lookups.ts` | Read queries + lookup helpers for `dance_styles` / `class_levels` |
| `lib/classes/queries.ts`, `lib/classes/actions.ts`, `lib/classes/helpers.ts`, `lib/classes/types.ts` | Class read queries, `'use server'` mutations (create/update/delete), helpers, and class-specific types |
| `lib/profiles/queries.ts`, `lib/profiles/actions.ts` | Profile read queries + `'use server'` mutations |
| `lib/stats/queries.ts` | Dashboard/stats read queries |
| `lib/utils.ts` | Shared utility functions |

**DB → TypeScript mapping:** The database uses snake_case columns; UI components use camelCase. Each feature slice's `queries.ts` owns its own DB → TS mapping — do not bypass it.

### Auth flow

`proxy.ts` intercepts all requests and redirects unauthenticated users away from `/dashboard` and `/onboarding` to `/login`. The dashboard layout (`app/dashboard/layout.tsx`) also double-checks auth server-side. Session refresh is handled by `proxy.ts` because Server Components cannot set cookies.

OAuth/email confirm redirect: `app/auth/callback/route.ts`. After registration, a trigger (`handle_new_user`, defined in `supabase/migrations/`) auto-creates a row in `public.profiles`.

### Page structure

- **Public:** `/` (home), `/clases` (browse), `/clases/[id]` (detail), `/profesores` (teacher directory), `/profesores/[id]` (teacher profile), `/mapa`, `/terminos`, `/terminos-publicacion`
- **Auth:** `/login`, `/registro`, `/confirmar-email`, `/reset-password`, `/completar-registro`
- **Protected (proxy-guarded):** `/dashboard/*`, `/onboarding`
- **Redirects** defined in `next.config.ts`: `/buscar` → `/clases`, `/clase/:id` → `/clases/:id`

### Supabase schema

Nine tables: catalog reference data (`dance_styles`, `class_levels`), `profiles` (extends `auth.users`) + `profile_styles`, `venues`, `classes` + `class_styles` + `class_schedules`, and `saved_classes` (bookmarks). `venues.city`/`venues.district` are free text, populated from Google Places `addressComponents` when a teacher picks an address in Crear Clase — not a curated lookup table. RLS is enabled on all tables: published classes are publicly readable; teachers can only manage their own classes. Storage bucket `class-images` is public-read; upload path must be `<user-id>/...`.

SQL schema: versioned migration files under `supabase/migrations/`, applied via `supabase db push` (Supabase CLI). Two projects exist: a disposable `kynea-dev` for testing migrations, and the shared production project. `npm run db:link:dev` / `db:link:prod` switch which one the CLI is linked to; `npm run db:push` applies pending migrations to whichever is currently linked. Pushing to production is also automated via CI on merge to `main`, gated behind a required-reviewer approval on the `supabase-production` GitHub Environment — never push to production directly unless that pipeline is down.

### Component conventions

- Route-colocated Client Components follow the `*Client.tsx` naming convention (e.g. `ClaseDetailClient.tsx`, `MisClasesClient.tsx`).
- Shared UI components live in `components/`.
- Server Actions always call `supabase.auth.getUser()` first and throw if no user — never trust client-supplied IDs for ownership checks.

## Pending TODOs

> These are known gaps agreed with the product owner. Do not implement them unless explicitly asked — but do not remove or duplicate them either.

### TODO: Campos exclusivos para academia en onboarding

Actualmente el onboarding de `profesor` y `academia` recoge exactamente los mismos campos (`app/onboarding/page.tsx`). La academia debería tener campos adicionales propios. Candidatos discutidos:

- **RUC** — identificación tributaria de la academia
- **Cantidad de sucursales** — número de locales/sedes
- **Número de profesores** — tamaño del equipo docente

Implementación sugerida: en `app/onboarding/page.tsx`, detectar `form.profileType === 'academia'` (o leer el rol del perfil) y mostrar un paso extra o campos adicionales en el paso "Datos públicos". Guardar estos valores en columnas nuevas de `profiles` (requiere migración SQL) o en `raw_user_meta_data` como solución temporal sin migración.

### TODO: Revisar `color-scheme: light` forzado cuando exista modo dark (u otros temas)

`app/globals.css` fuerza `color-scheme: light` en `html` y específicamente en `gmp-place-autocomplete` (el widget de Google Places en Crear Clase). Se agregó porque Kynea hoy solo tiene tema claro — sin esto, un profesor con su SO/navegador en modo oscuro ve el widget de dirección como una barra negra rota, ya que el componente de Google evalúa `prefers-color-scheme` en su propio shadow DOM.

Si Kynea llega a implementar modo dark (u otros temas) en el futuro, esto hay que revisitarlo: el `color-scheme: light` habría que hacerlo condicional al tema activo en vez de fijo, y el selector `gmp-place-autocomplete { color-scheme: light }` debería pasar a `color-scheme: light dark` (o el valor que corresponda) para que el widget de Google siga el tema real de la app en vez de quedar forzado a claro siempre.
