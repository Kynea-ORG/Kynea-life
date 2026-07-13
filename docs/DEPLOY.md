# Deploy

Kynea se despliega en dos capas independientes: la app (Vercel) y la base de datos (dos proyectos de Supabase, `kynea-dev` y producción).

## A. Vercel (hosting de la app)

### 1. Importar el repo

1. Entra a [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → selecciona `Kynea-ORG/Kynea-life`
3. Vercel detecta Next.js automáticamente — no cambies el Framework Preset ni los comandos de build.

### 2. Variables de entorno

En la pantalla de import (o en **Settings → Environment Variables**), agrega estas dos
(las mismas de tu `.env.local`):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<tu-proyecto>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |

Aplícalas a **Production**, **Preview** y **Development**.

### 3. Deploy

Click **Deploy**. Obtendrás una URL tipo `https://kynea-life.vercel.app`.

### 4. Configurar Supabase con la URL de producción

**Authentication → URL Configuration:**
- **Site URL:** `https://kynea-life.vercel.app` (tu dominio de Vercel)
- **Redirect URLs:** agrega `https://kynea-life.vercel.app/**`

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

### Flujo local / manual

```bash
npm run db:link:dev    # o npm run db:link:prod, según el proyecto destino
npm run db:push         # aplica las migraciones pendientes al proyecto vinculado
```

### Flujo automático (CI)

Dos GitHub Actions workflows aplican migraciones automáticamente cuando cambia algo bajo `supabase/migrations/**`:

- **`.github/workflows/supabase-dev-push.yml`** — se dispara en push a `develop`. Vincula `kynea-dev` (`secrets.SUPABASE_DEV_PROJECT_REF`) y corre `supabase db push --yes`.
- **`.github/workflows/supabase-prod-push.yml`** — se dispara en push a `main`. Vincula producción (`hmvonvxgmvwfnhlmrgpg`) y corre `supabase db push --yes`, pero el job usa el **GitHub Environment `supabase-production`**, que exige aprobación de un reviewer autorizado antes de ejecutarse.

> **Nunca apliques migraciones a producción manualmente** salvo que el pipeline de CI esté caído — el flujo normal es: mergear a `main` → el workflow pausa esperando aprobación en el Environment `supabase-production` → un reviewer aprueba → se aplica.
