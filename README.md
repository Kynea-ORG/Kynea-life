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

## Documentación

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — contexto del proyecto, dominio y schema de base de datos
- [`docs/TASKS.md`](docs/TASKS.md) — handoff de desarrollo y trabajo pendiente
- [`docs/BUGS.md`](docs/BUGS.md) — bugs conocidos
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — despliegue en Vercel y migraciones de base de datos
- [`CLAUDE.md`](CLAUDE.md) — guía de arquitectura y convenciones para agentes de código
- [`AGENTS.md`](AGENTS.md) — advertencia sobre breaking changes de Next.js 16 en este repo

## Nota sobre Next.js 16

Este proyecto usa una versión de Next.js con breaking changes respecto a versiones anteriores (por ejemplo, el middleware se llama `proxy.ts` y exporta `proxy`, no `middleware`; `cookies()` es async). Ver [`AGENTS.md`](AGENTS.md) antes de escribir código nuevo.
