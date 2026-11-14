# Deploy

Kynea se despliega en dos capas independientes: la app (Vercel) y la base de datos (dos proyectos de Supabase, `kynea-dev` y producción).

## A. Vercel (hosting de la app)

### 1. Importar el repo

1. Entra a [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → selecciona `Kynea-ORG/Kynea-life`
3. Vercel detecta Next.js automáticamente — no cambies el Framework Preset ni los comandos de build.

### 2. Variables de entorno y Custom Environments (Vercel Pro)

En **Settings → Environments** de Vercel Pro se configuran los espacios de despliegue separados:

| Environment Vercel | Rama vinculada | Dominio | `NEXT_PUBLIC_APP_ENV` | Proyecto Supabase |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `main` | `www.kynea.dance` | `production` | Producción (`hmvonvxgmvwfnhlmrgpg`) |
| **Staging** *(Custom)* | `develop` | `dev.kynea.dance` | `staging` | `kynea-dev` (`uibigobubqrolozvrkzd`) |
| **Sandbox** *(Custom)* | `sandbox` | `sandbox.kynea.dance` | `sandbox` | `kynea-dev` (`uibigobubqrolozvrkzd`) |
| **Preview** | PRs / `epic/*` / `feature/*` | `*.vercel.app` | `preview` | `kynea-dev` (`uibigobubqrolozvrkzd`) |

> [!IMPORTANT]
> **Protección SEO y analítica automática:** El helper `isProductionDeployment()` ([`lib/env.ts`](../lib/env.ts)) verifica `VERCEL_ENV`, `VERCEL_TARGET_ENV` y `NEXT_PUBLIC_APP_ENV`. Fuera de `Production`, [`next.config.ts`](../next.config.ts) envía automáticamente `X-Robots-Tag: noindex, nofollow`, [`app/robots.ts`](../app/robots.ts) bloquea todo rastreo (`Disallow: /`) y [`app/layout.tsx`](../app/layout.tsx) desactiva GTM. Además, en Vercel Pro conviene activar **Deployment Protection (Vercel Authentication)** en `Staging`, `Sandbox` y `Preview`.

En cada entorno (o compartido según corresponda), configura las variables de `.env.example`:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_APP_ENV` | `production` \| `staging` \| `sandbox` \| `preview` (según entorno) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<tu-proyecto>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role key, Settings → API) |
| `UPSTASH_REDIS_REST_URL` | `https://<tu-base-de-datos>.upstash.io` (Settings → REST API) |
| `UPSTASH_REDIS_REST_TOKEN` | `AY...` (Settings → REST API) |
| `CRON_SECRET` | `<secreto-aleatorio>` (Protección de crons en Vercel) |

`SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` y `CRON_SECRET` son server-only: nunca las expongas con prefijo `NEXT_PUBLIC_` ni las subas al repo.

### 3. Deploy

Click **Deploy**. Obtendrás la URL de producción (`www.kynea.dance`) y los dominios configurados para `Staging` y `Sandbox`.

### 4. Configurar Supabase con las URLs de cada entorno

En **Producción (`hmvonvxgmvwfnhlmrgpg`) → Authentication → URL Configuration:**
- **Site URL:** `https://www.kynea.dance`
- **Redirect URLs:** `https://www.kynea.dance/**`

En **`kynea-dev` (`uibigobubqrolozvrkzd`) → Authentication → URL Configuration:**
- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** agrega:
  - `http://localhost:3000/**`
  - `https://dev.kynea.dance/**`
  - `https://sandbox.kynea.dance/**`
  - `https://kynea-*.vercel.app/**` (para OAuth y magic links en Preview Deployments)

> El código usa `window.location.origin`, así que los redirects de OAuth y reset
> de contraseña se adaptan solos al dominio. Solo falta autorizarlos aquí.

### 5. Confirmación de email — elige UNA opción

**Opción A — Código de 6 dígitos (recomendado para producción):**
- Authentication → Emails → **Confirm signup** → usa una plantilla con `{{ .Token }}`
  y SIN `{{ .ConfirmationURL }}` (para evitar que Gmail pre-escanee el link).

**Opción B — Sin confirmación (cero fricción para testing):**
- Authentication → Sign In / Providers → Email → desactiva **Confirm email**.
- Los usuarios entran directo al registrarse.

### 6. (Opcional) Google OAuth

Authentication → Providers → Google → Enable, con Client ID/Secret de Google
Cloud Console. En Google Console autoriza el callback de Supabase:
`https://<tu-proyecto>.supabase.co/auth/v1/callback`

## B. Base de datos (migraciones de Supabase)

El schema vive versionado en `supabase/migrations/` (14 migraciones). No hay un archivo único de schema ni pasos manuales de SQL Editor como mecanismo principal — las migraciones se aplican con la Supabase CLI.

Existen **dos proyectos Supabase** separados:

| Proyecto | Ref | Uso |
|----------|-----|-----|
| `kynea-dev` | `uibigobubqrolozvrkzd` | Pruebas de migraciones, ambiente desechable |
| Producción | `hmvonvxgmvwfnhlmrgpg` | Proyecto compartido en vivo |

### Jobs programados (`pg_cron`)

La migración 62 habilita la extensión `pg_cron` y agenda `publish-series-copies` (diario, 11:00 UTC = 06:00 Lima), que publica las copias de series mensuales cuya fecha de publicación ya llegó (`publish_due_series_copies()`). Corre dentro de cada proyecto Supabase, así que existe igual en `kynea-dev` y en producción — no usa Vercel Cron ni variables de entorno. Verificar tras migrar: `select jobname, schedule, active from cron.job;` y, para probar a mano, `select public.publish_due_series_copies();`. Si `pg_cron` no se puede habilitar en el proyecto, la migración falla a propósito (sin el job las copias nunca se publicarían solas).

### Jobs programados en Vercel (`vercel.json`)

Kynea incluye un job programado en Vercel para ejecutar `/api/cron/daily-suggestions` diariamente a las 00:05 Lima (05:05 UTC = `5 5 * * *`).
- **Seguridad (`CRON_SECRET`)**: Debe agregarse en **Settings → Environment Variables** en Vercel. Vercel la inyecta automáticamente en la cabecera `Authorization: Bearer <CRON_SECRET>` en cada ejecución para proteger el endpoint contra invocaciones externas no autorizadas.
- Para generar una clave segura: `openssl rand -hex 32`.

### Flujo local / manual

```bash
npm run db:link:dev    # o npm run db:link:prod, según el proyecto destino
npm run db:push         # aplica las migraciones pendientes al proyecto vinculado
```

### Flujo automático (CI)

Dos GitHub Actions workflows aplican migraciones automáticamente cuando cambia algo bajo `supabase/migrations/**`:

- **`.github/workflows/supabase-dev-push.yml`** — se dispara en push a `develop`. Vincula `kynea-dev` (`secrets.SUPABASE_DEV_PROJECT_REF`) y corre `supabase db push --yes`.
- **`.github/workflows/supabase-prod-push.yml`** — se dispara en push a `main` (o manualmente vía `workflow_dispatch`). Vincula producción (`hmvonvxgmvwfnhlmrgpg`) y corre `supabase db push --yes` usando `secrets.SUPABASE_PROD_DB_PASSWORD`.

> **Flujo de migraciones**: Probar primero en `develop` (se aplica automático a `kynea-dev`) → validar → mergear a `main` para aplicar a producción (o disparar manualmente el workflow `Push migrations to production` desde Actions).
