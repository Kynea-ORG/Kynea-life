# Kynea

Kynea es el directorio de referencia de clases de danza en Perú. Conecta a alumnos con profesores y academias que publican sus clases — el contacto entre ambos siempre ocurre fuera de la plataforma (WhatsApp, Instagram, sitio web).

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) (`@supabase/ssr`)

## Setup

Requisitos: Node.js y la [Supabase CLI](https://supabase.com/docs/guides/cli) instalados.

1. Copia el archivo de plantilla de variables de entorno y complétalo:

   ```bash
   cp .env.example .env.local
   ```

   `.env.local` necesita:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

2. Instala dependencias y levanta el servidor de desarrollo:

   ```bash
   npm install
   npm run dev
   ```

   La app queda disponible en [http://localhost:3000](http://localhost:3000).

## Comandos

```bash
npm run dev             # servidor de desarrollo (localhost:3000)
npm run build            # build de producción
npm run lint              # ESLint (Next.js core-web-vitals + reglas TypeScript)

npm run db:link:dev      # vincula la CLI de Supabase al proyecto kynea-dev
npm run db:link:prod     # vincula la CLI de Supabase al proyecto de producción
npm run db:push          # aplica las migraciones pendientes al proyecto vinculado
```

## Optimización de imágenes

Vercel (plan Hobby) cobra por cuota de optimización de imágenes y devuelve `402` al agotarla. Para evitarlo, `next.config.ts` usa un [custom loader](https://nextjs.org/docs/app/api-reference/config/next-config-js/images#loader) (`image-loader.ts`) que sirve las imágenes a través de un proveedor externo en vez del optimizador built-in.

El proveedor activo se elige con `NEXT_PUBLIC_IMAGE_PROVIDER` — cambiarlo no requiere tocar ningún componente `<Image>`.

| Proveedor | Env var | Plan free | Cuándo usarlo |
|---|---|---|---|
| **wsrv.nl** (default) | `NEXT_PUBLIC_IMAGE_PROVIDER=wsrv` | Gratis, sin cuenta, sin límite documentado de transformaciones | Ahora mismo — cero setup |
| **ImageKit** | `NEXT_PUBLIC_IMAGE_PROVIDER=imagekit` + `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | 20GB de banda/mes, transformaciones ilimitadas | Cuando el tráfico de wsrv deje de ser suficiente |

Migrar a ImageKit el día que haga falta:
1. Crear una cuenta free en [imagekit.io](https://imagekit.io).
2. En el dashboard, tomar el **URL-endpoint** de la cuenta (`https://ik.imagekit.io/tu_id`) — no requiere configurar un origin de storage, el loader usa la variante "web proxy" (ImageKit hace fetch directo de la URL pública de Supabase).
3. En `.env.local` (y en las env vars de Vercel): `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tu_id` y `NEXT_PUBLIC_IMAGE_PROVIDER=imagekit`.
4. Redeploy. Sin cambios de código.

Si `NEXT_PUBLIC_IMAGE_PROVIDER` tiene un valor no reconocido (o falta), el loader cae a `wsrv` como fallback seguro. Los assets locales (`/logo.png`, `/categorias/*`) se devuelven tal cual sin pasar por ningún proveedor — ni wsrv ni ImageKit pueden fetchear una ruta relativa, y de todos modos no necesitan optimización remota.

### Resiliencia — dos capas de fallback

`image-loader.ts` es una función pura: solo construye una URL, no puede hacer `try/catch` de red. Por eso el fallback ante un fallo del proveedor vive en dos capas distintas:

1. **`default=` de wsrv (primera línea, dentro del loader)** — si wsrv.nl no logra transformar la imagen en su servidor, el parámetro `default=<src>` le dice que sirva la original de Supabase igual, sin devolver un error. Cubre fallos de transformación del lado del proveedor.
2. **`components/SmartImage.tsx` + `onError` (segunda línea, en el navegador)** — cubre lo que la capa 1 no puede: fallos de red/CDN al cargar la imagen ya optimizada. Es un wrapper de `next/image` que:
   - Reenvía todas las props de `<Image>` sin cambios.
   - Si la imagen optimizada falla al cargar, loguea un `console.warn` y reintenta con la misma `src` (la URL original de Supabase) pero con `unoptimized` — eso hace que `next/image` NO llame al loader y pida la imagen directa.
   - Si esa segunda carga también falla (ej. la URL de Supabase está rota), loguea una sola vez y no reintenta más — evita un bucle infinito.

Usar `<SmartImage>` en vez de `<Image>` solo donde el `src` sea una URL de Supabase — imágenes locales (`/logo.png`, assets de `/categorias/`) y de otros orígenes (ej. avatar de Google OAuth) siguen usando `<Image>` normal, no necesitan esta capa.

**Cómo forzar un fallo para probar:**
1. En `.env.local`, poné temporalmente `NEXT_PUBLIC_IMAGE_PROVIDER=imagekit` sin definir `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` — o cualquier valor de proveedor que apunte a un endpoint inválido.
2. `npm run dev` y abrí cualquier página con fotos de perfil o portadas de clase.
3. Deberías ver en la consola del navegador `[SmartImage] Optimización falló para ..., sirviendo original de Supabase`, y la imagen original de Supabase igual carga (sin imagen rota).
4. Revertí la env var.

### Health-check opcional del proveedor

`lib/images/checkImageProvider.ts` expone `checkImageProvider()`, que hace un `HEAD` de prueba al proveedor activo. Se ejecuta **una sola vez por carga de la app, solo en desarrollo** (`components/ImageProviderHealthCheck.tsx`, montado en `app/layout.tsx`) — no bloquea el render ni se repite en cada request. Si el proveedor no responde, loguea un `console.warn` avisando que `SmartImage` va a caer al fallback si hace falta.

Desactivable con `NEXT_PUBLIC_IMAGE_HEALTHCHECK=false` en `.env.local`.

## Documentación

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — contexto del proyecto, dominio y schema de base de datos
- [`docs/TASKS.md`](docs/TASKS.md) — handoff de desarrollo y trabajo pendiente
- [`docs/BUGS.md`](docs/BUGS.md) — bugs conocidos
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — despliegue en Vercel y migraciones de base de datos
- [`CLAUDE.md`](CLAUDE.md) — guía de arquitectura y convenciones para agentes de código
- [`AGENTS.md`](AGENTS.md) — advertencia sobre breaking changes de Next.js 16 en este repo

## Nota sobre Next.js 16

Este proyecto usa una versión de Next.js con breaking changes respecto a versiones anteriores (por ejemplo, el middleware se llama `proxy.ts` y exporta `proxy`, no `middleware`; `cookies()` es async). Ver [`AGENTS.md`](AGENTS.md) antes de escribir código nuevo.
