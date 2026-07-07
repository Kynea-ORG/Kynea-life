# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (@supabase/ssr).

### Next.js 16 breaking changes in this repo

- **Middleware is renamed to Proxy.** The file is `proxy.ts` (not `middleware.ts`) and the exported function must be named `proxy` (not `middleware`). See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **`cookies()` is async** in Next.js 16 — must be `await cookies()`. Already handled in `lib/supabase/server.ts`.

### Data layer

| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | Server-side Supabase client (RSC / Server Actions / Route Handlers) |
| `lib/supabase/client.ts` | Browser Supabase client (Client Components) |
| `lib/types.ts` | All domain types: `DanceClass`, `Teacher`, `TimeSlot`, etc. |
| `lib/queries/classes.ts` | Read queries + `mapDbClassToType` / `mapTeacher` (DB snake_case → TS camelCase) |
| `lib/actions/classes.ts` | `'use server'` mutations: create/update/delete/duplicate class, update profile |

**DB → TypeScript mapping:** The database uses snake_case columns; all UI components use camelCase fields from `DanceClass` / `Teacher`. The mappers in `lib/queries/classes.ts` are the single source of truth for this translation — do not bypass them.

### Auth flow

`proxy.ts` intercepts all requests and redirects unauthenticated users away from `/dashboard` and `/onboarding` to `/login`. The dashboard layout (`app/dashboard/layout.tsx`) also double-checks auth server-side. Session refresh is handled by `proxy.ts` because Server Components cannot set cookies.

OAuth/email confirm redirect: `app/auth/callback/route.ts`. After registration, a trigger (`handle_new_user`, defined in `supabase/migrations/`) auto-creates a row in `public.profiles`.

### Page structure

- **Public:** `/` (home), `/clases` (browse), `/clases/[id]` (detail), `/profesores/[id]` (teacher profile)
- **Auth:** `/login`, `/registro`, `/confirmar-email`, `/reset-password`
- **Protected (proxy-guarded):** `/dashboard/*`, `/onboarding`
- **Redirects** defined in `next.config.ts`: `/buscar` → `/clases`, `/clase/:id` → `/clases/:id`

### Supabase schema

Three tables: `profiles` (extends `auth.users`), `classes`, `saved_classes` (bookmarks). RLS is enabled on all tables: published classes are publicly readable; teachers can only manage their own classes. Storage bucket `class-images` is public-read; upload path must be `<user-id>/...`.

SQL schema: versioned migration files under `supabase/migrations/`, applied via `supabase db push` (Supabase CLI, linked to the project via `supabase link --project-ref <ref>`).

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
