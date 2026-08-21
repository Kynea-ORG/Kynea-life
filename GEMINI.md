# GEMINI.md

Este archivo proporciona contexto, directrices de arquitectura y reglas de desarrollo para Gemini / Antigravity al trabajar en el repositorio **Kynea-life**.

---

## 📌 Contexto del Proyecto

**Kynea** es una plataforma web para el ecosistema de la danza en Perú. Conecta a profesores y academias con alumnos que buscan clases de baile. El contacto entre alumno y profesor/academia se realiza de forma externa (WhatsApp, Instagram, web).

- **Roles de usuario:**
  - `alumno`: Busca y guarda clases en favoritos. No publica.
  - `profesor`: Publica y gestiona sus propias clases independientes. Cuenta con dashboard.
  - `academia`: Gestiona un estudio/academia de baile. Cuenta con dashboard.
  *(El rol se define siempre antes del registro; no existe pre-selección).*

---

## 📚 Índice de Documentación Relevante

- [`docs/CONTEXT.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/docs/CONTEXT.md) — Contexto de negocio y esquema completo de base de datos.
- [`docs/WORKFLOW.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/docs/WORKFLOW.md) — Flujo de trabajo con ramas, PRs y políticas de CODEOWNERS.
- [`docs/DEPLOY.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/docs/DEPLOY.md) — Flujo de despliegue en Vercel y migraciones en Supabase.
- [`docs/TASKS.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/docs/TASKS.md) — Tareas pendientes y backlog.
- [`docs/BUGS.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/docs/BUGS.md) — Bugs conocidos e incidentes.
- [`docs/HOTFIX.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/docs/HOTFIX.md) — Procedimiento de emergencia para bypass de branch protection.
- [`.agents/skills/run-kynea-life/SKILL.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/.agents/skills/run-kynea-life/SKILL.md) — Driver Playwright para pruebas end-to-end de registro, onboarding y creación de clases.

---

## ⚠️ Regla Crítica: Apertura de Pull Requests

> [!IMPORTANT]
> **Todo PR en este repo que modifique `lib/`, `supabase/` o `proxy.ts` DEBE ser creado con la cuenta bot `joseniquen08-pr`** (nunca con `joseniquen08`).

**Motivo:** [`CODEOWNERS`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/.github/CODEOWNERS) exige la aprobación obligatoria de `@joseniquen08` en esas rutas. GitHub impide que el autor de un PR apruebe su propio PR. Si el PR es creado por `joseniquen08`, queda bloqueado e inaprobable.

**Forma correcta de crear PRs:**
```bash
GH_TOKEN=$(cat ~/.kynea-bot-token) gh pr create --repo Kynea-ORG/Kynea-life ...
```
*Nota: Nunca ejecutes `gh auth switch` ni `gh auth login` para esto, ya que el token bot no tiene el scope `read:org` y fallará. Pasa `GH_TOKEN` únicamente como variable de entorno al comando `gh pr create`.*

---

## 🛠️ Comandos de Desarrollo

```bash
npm run dev        # Servidor de desarrollo en http://localhost:3000
npm run build      # Build de producción
npm run lint       # ESLint (reglas de Next.js + TypeScript)
npm run test       # Vitest (tests unitarios en lib/)
npx tsc --noEmit   # Verificación de tipos TypeScript
```

### Base de Datos (Supabase CLI)
```bash
npm run db:link:dev   # Vincular CLI al proyecto de desarrollo (kynea-dev)
npm run db:link:prod  # Vincular CLI al proyecto de producción
npm run db:push       # Aplicar migraciones locales al proyecto vinculado
```

---

## 💻 Stack Tecnológico y Convenciones

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, Lucide React
- **Lenguaje:** TypeScript 5+
- **Base de Datos & Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Testing:** Vitest, React Testing Library, Playwright (skills)

### Particularidades de Next.js 16 en este repo
1. **Middleware renombrado a Proxy:** El archivo es [`proxy.ts`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/proxy.ts) (no `middleware.ts`) y la función exportada debe llamarse `proxy` (no `middleware`).
2. **`cookies()` es asíncrono:** Siempre debe usarse con `await cookies()` (ya implementado en [`lib/supabase/server.ts`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/supabase/server.ts)).

### Arquitectura de Capas (`lib/`)
La lógica de negocio y datos está modularizada por dominio (feature-sliced):

| Archivo / Carpeta | Propósito |
|---|---|
| [`lib/supabase/server.ts`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/supabase/server.ts) | Cliente Supabase para Server Components, Server Actions y Route Handlers |
| [`lib/supabase/client.ts`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/supabase/client.ts) | Cliente Supabase en el navegador (Client Components) |
| [`lib/types.ts`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/types.ts) | Tipos de dominio compartidos |
| [`lib/auth/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/auth) | Mutaciones de autenticación (`'use server'`) y redirección por rol |
| [`lib/catalog/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/catalog) | Consultas de `dance_styles` y `class_levels` |
| [`lib/classes/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/classes) | Consultas y mutaciones de clases (`'use server'`), helpers y tipos |
| [`lib/profiles/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/profiles) | Consultas y mutaciones de perfiles de usuario |
| [`lib/stats/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/stats) | Consultas para métricas y dashboards |
| [`lib/utils.ts`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/lib/utils.ts) | Utilidades compartidas |

### Convenciones de Código
- **Mapeo DB ↔ TypeScript:** Las columnas en la base de datos usan `snake_case`; los componentes UI y modelos TypeScript usan `camelCase`. Cada módulo en `lib/*/queries.ts` realiza su propia transformación de mapeo. No saltarse esta capa.
- **Client Components coubicados:** Usan el sufijo `*Client.tsx` (ej. `ClaseDetailClient.tsx`, `MisClasesClient.tsx`).
- **Componentes compartidos:** Viven bajo [`components/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/components).
- **Seguridad en Server Actions:** Siempre invocar `const { data: { user } } = await supabase.auth.getUser()` al inicio y verificar permisos. Nunca confiar en IDs enviados desde el cliente para autorizaciones.

---

## 🗄️ Esquema de Base de Datos y Supabase

- **Migraciones:** Todas las migraciones están versionadas en [`supabase/migrations/`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/supabase/migrations).
- **Tablas principales:**
  - `dance_styles`, `class_levels` (catálogos de solo lectura)
  - `profiles` (extensión de `auth.users`, creada automáticamente vía trigger `handle_new_user`), `profile_styles`
  - `venues` (locales reutilizables para clases con ciudad/distrito y coordenadas)
  - `classes`, `class_styles`, `class_schedules`
  - `saved_classes` (bookmarks de alumnos)
- **Seguridad (RLS):** Habilitado en todas las tablas. Clases publicadas son de lectura pública; profesores y academias solo mutan sus propios recursos.
- **Storage:** Bucket público `class-images`. La ruta de subida siempre debe estructurarse como `<user-id>/...`.

---

## ⚙️ Entorno y Variables de Configuración

Copia `.env.example` a `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=... # Opcional: si falta, el campo de dirección degrada a un input estándar
```

---

## 🧪 Testing y Validación

Antes de dar una tarea por completada o abrir un PR:
1. Ejecutar `npm run lint` y `npx tsc --noEmit`.
2. Si se modificó lógica en `lib/`, ejecutar `npm run test`.
3. Para pruebas E2E contra `kynea-dev`, revisar el skill [`.agents/skills/run-kynea-life/SKILL.md`](file:///Users/joseniquen/Documents/Freelos/Repos/kynea/Kynea-life/.agents/skills/run-kynea-life/SKILL.md).

---

## 📌 Gotchas y Recordatorios Importantes

- **Restricción de emails en Supabase Dev (Resend):** En `kynea-dev`, los correos de confirmación solo pueden enviarse a la dirección verificada del propietario de la cuenta de Supabase. Registrar emails ficticios causará un error `500` de Resend.
- **Degradación de Google Maps:** Si `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` no está configurada, el componente de dirección en Crear Clase usa un `<input>` de texto estándar (`placeholder="Av. Benavides 1234, piso 3"`). Esto es un fallback esperado y diseñado.
- **`color-scheme: light`:** `app/globals.css` fuerza tema claro en `html` y `gmp-place-autocomplete` para evitar bugs visuales en navegadores con modo oscuro activo.
- **CodeGraph:** Usar `codegraph_explore` para analizar impactos, referencias de símbolos y arquitectura antes de realizar cambios estructurales en el repositorio.
