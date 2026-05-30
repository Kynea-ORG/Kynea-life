# Deploy en Vercel

## 1. Importar el repo en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → selecciona `davidvilcao/kynea-life`
3. Vercel detecta Next.js automáticamente — no cambies el Framework Preset ni los comandos de build.

## 2. Variables de entorno

En la pantalla de import (o en **Settings → Environment Variables**), agrega estas dos
(las mismas de tu `.env.local`):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<tu-proyecto>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |

Aplícalas a **Production**, **Preview** y **Development**.

## 3. Deploy

Click **Deploy**. Obtendrás una URL tipo `https://kynea-life.vercel.app`.

## 4. Configurar Supabase con la URL de producción

**Authentication → URL Configuration:**
- **Site URL:** `https://kynea-life.vercel.app` (tu dominio de Vercel)
- **Redirect URLs:** agrega `https://kynea-life.vercel.app/**`

> El código usa `window.location.origin`, así que los redirects de OAuth y reset
> de contraseña se adaptan solos al dominio. Solo falta autorizarlos aquí.

## 5. Confirmación de email — elige UNA opción

**Opción A — Código de 6 dígitos (recomendado para producción):**
- Authentication → Emails → **Confirm signup** → usa una plantilla con `{{ .Token }}`
  y SIN `{{ .ConfirmationURL }}` (para evitar que Gmail pre-escanee el link).

**Opción B — Sin confirmación (cero fricción para testing):**
- Authentication → Sign In / Providers → Email → desactiva **Confirm email**.
- Los usuarios entran directo al registrarse.

## 6. Aplicar la migración SQL (una sola vez)

Supabase Dashboard → SQL Editor → pega y ejecuta el contenido de
`supabase/migrations/002_add_class_columns.sql`.
Sin esto, crear clases falla (faltan columnas `offer_price` y `contact_mode`).

## 7. (Opcional) Google OAuth

Authentication → Providers → Google → Enable, con Client ID/Secret de Google
Cloud Console. En Google Console autoriza el callback de Supabase:
`https://<tu-proyecto>.supabase.co/auth/v1/callback`
