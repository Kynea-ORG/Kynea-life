# Kynea — Contexto del Proyecto

## Qué es Kynea

Kynea es una plataforma web para el ecosistema de la danza en Perú. Conecta a profesores y academias con alumnos que buscan clases de baile. El contacto entre alumno y profesor es siempre externo a la plataforma (WhatsApp, Instagram, sitio web).

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.x (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Lenguaje | TypeScript 5 |
| Backend / Auth / DB | Supabase (@supabase/ssr) |
| Despliegue | Vercel (inferido por configuración) |

### Particularidades de Next.js 16 en este proyecto
- El archivo de middleware se llama `proxy.ts` (no `middleware.ts`) y exporta la función como `proxy`
- `cookies()` es async — siempre se usa con `await`

---

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| `alumno` | Busca y guarda clases. No puede publicar. |
| `profesor` | Publica clases de manera independiente. Tiene dashboard. |
| `academia` | Gestiona un estudio o academia. Tiene dashboard. |

El rol se elige **siempre antes de crear la cuenta**, tanto para registro con correo como con Google. No existe pre-selección.

---

## Base de datos (Supabase)

El schema vive versionado en `supabase/migrations/` (14 migraciones, `20260705000000_00_reset.sql` … `20260705000130_13_grants.sql`). Ya no existe un archivo único de schema — cada migración es la fuente de verdad de su parte del modelo.

### Catálogos

Tablas de solo lectura desde el cliente (escritura solo vía SQL admin).

#### `dance_styles`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | smallserial | PK |
| `name` | text | Nombre único |
| `slug` | text | Slug único |
| `emoji` | text | Emoji representativo |
| `ord` | smallint | Orden de listado |

#### `class_levels`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | smallserial | PK |
| `name` | text | Nombre único (ej. "Principiante") |
| `ord` | smallint | Orden de listado |

### `profiles`
Extiende `auth.users`. Se crea automáticamente vía trigger `handle_new_user` al registrarse.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, FK → `auth.users` |
| `role` | text | Nullable — `alumno` \| `profesor` \| `academia` (nullable por la ventana OAuth antes de `/completar-registro`) |
| `name` | text | Nombre público |
| `photo_url` | text | URL de foto de perfil |
| `bio` | text | Descripción pública |
| `years_experience` | integer | Años de experiencia |
| `whatsapp` | text | Número de contacto |
| `instagram` | text | Handle de Instagram |
| `tiktok` | text | Handle de TikTok |
| `youtube` | text | Canal de YouTube |
| `website` | text | URL de sitio web |
| `is_admin` | boolean | `NOT NULL DEFAULT false` — solo escribible vía conexión directa a la DB (`postgres`/`service_role`/`supabase_admin`), ver Funciones / Triggers |
| `created_by` | uuid | `NULL` — FK → `auth.users`, `ON DELETE SET NULL`. `NULL` = se registró solo; no-`NULL` = uuid del admin que creó la cuenta desde `/dashboard/admin`. Advisory: no es un control de seguridad, ver Funciones / Triggers |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | Se actualiza en cada mutación (trigger) |

#### `profile_styles`
Estilos que enseña el profesor/academia (o que prefiere el alumno). PK compuesta `(profile_id, style_id)`, ambos FK.

### `venues`
Locales físicos reutilizables — un profesor puede tener varios y asignarlos a distintas clases sin repetir la dirección.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `owner_id` | uuid | FK → `profiles` |
| `name` | text | Nombre del local (NOT NULL) |
| `address` | text | Dirección |
| `reference` | text | Referencia de ubicación |
| `city` | text | Provincia/ciudad — texto libre, extraído de Google Places `addressComponents` al elegir la dirección en Crear Clase |
| `district` | text | Distrito — texto libre, mismo origen que `city` |
| `maps_url` | text | Link de Google Maps |
| `lat` / `lng` | double precision | Coordenadas geográficas |
| `created_at` / `updated_at` | timestamptz | — |

### `classes`
Clases publicadas por profesores y academias.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `teacher_id` | uuid | FK → `profiles` |
| `venue_id` | uuid | FK → `venues`, `ON DELETE SET NULL` |
| `slug` | text | Único, asignado por trigger al INSERT |
| `title` | text | Título de la clase |
| `type` | text | `clase` \| `taller` \| `curso` \| `masterclass` \| `evento` \| `clase-suelta` |
| `modality` | text | `Presencial` \| `Online` |
| `level_id` | smallint | FK → `class_levels` |
| `short_description` | text | Descripción corta (listados) |
| `full_description` | text | Descripción completa (detalle) |
| `what_you_learn` | text[] | Lista de aprendizajes |
| `for_whom` | text | A quién va dirigido |
| `requirements` | text | Requisitos previos |
| `start_date` | date | Fecha de inicio |
| `end_date` | date | Fecha de fin (opcional) |
| `price_type` | text | `Gratis` \| `Por clase` \| `Mensual` \| `Paquete` |
| `price` | numeric(10,2) | Precio |
| `offer_price` | numeric(10,2) | Precio con descuento (opcional) |
| `currency` | text | `PEN` \| `USD` (default `PEN`) |
| `is_trial_free` | boolean | Si la primera clase es gratis |
| `max_spots` | integer | Cupo máximo |
| `available_spots` | integer | Cupos disponibles |
| `contact_mode` | text | `whatsapp` \| `instagram` \| `web` (default `whatsapp`) |
| `platform` | text | Plataforma online (Zoom, Meet, etc.) — solo clases Online |
| `access_link` | text | Enlace de acceso online — solo clases Online |
| `cover_image` | text | URL de imagen principal |
| `gallery` | text[] | URLs de galería adicional |
| `video_url` | text | URL de video de presentación |
| `footwear` | text | Calzado requerido |
| `clothing` | text | Vestimenta requerida |
| `to_bring` | text[] | Lista de qué llevar |
| `age_group` | text | Grupo etario |
| `views_count` | integer | Contador de vistas (NOT NULL DEFAULT 0) |
| `contacts_count` | integer | Contador de contactos, incrementado vía RPC `increment_class_contacts` (NOT NULL DEFAULT 0) |
| `saved_count` | integer | Contador de guardados (NOT NULL DEFAULT 0) |
| `status` | text | `draft` \| `published` \| `finished` \| `archived` |
| `created_at` / `published_at` / `updated_at` | timestamptz | — |

Ubicación (`address`, `reference`, `maps_url`, `lat`, `lng`), estilos y horarios **no** son columnas de `classes` — viven en `venues`, `class_styles` y `class_schedules` respectivamente.

#### `class_styles`
Estilos de una clase — uno puede marcarse `is_main = true` (principal). PK compuesta `(class_id, style_id)`.

#### `class_schedules`
Horarios normalizados (reemplaza el antiguo `time_slots` jsonb): `id`, `class_id`, `day_of_week` (smallint, `0` = Lunes … `6` = Domingo), `start_time`, `end_time`.

#### `saved_classes`
Bookmarks de alumnos. PK compuesta `(user_id, class_id)`.

### RLS
Todas las tablas tienen Row Level Security activado:
- `profiles`: lectura pública, escritura solo al propio perfil
- `classes`: publicadas son públicas; el profesor gestiona solo las suyas
- `venues`: gestionadas solo por su `owner_id`
- `saved_classes`: cada usuario solo ve y modifica los suyos

### Funciones / Triggers
- `handle_new_user()` — trigger `AFTER INSERT` en `auth.users`, crea el profile automáticamente (`role` puede quedar `NULL` en el flujo OAuth desde `/login`). Desde la migración 32 también lee `raw_user_meta_data->>'created_by'` y lo valida contra `is_admin` (solo se acepta si el uuid pertenece a un admin real) antes de guardarlo en `profiles.created_by` — **`created_by` es procedencia informativa, no un control de seguridad**, ya que `raw_user_meta_data` lo controla el cliente y los uuids de admins son enumerables (`profiles_select` es `USING (true)`)
- `class_slug_on_insert` — trigger `BEFORE INSERT` en `classes`, asigna el `slug` vía `set_class_slug()`
- `set_updated_at_*` — triggers `BEFORE UPDATE` en `profiles`, `classes` y `venues`
- `increment_class_contacts(target_class_id)` — RPC `SECURITY DEFINER`, incrementa `contacts_count` sin race condition (solo si `status = 'published'`)
- `email_signup_provider(p_email)` — RPC `SECURITY DEFINER`, devuelve `'email'` \| `'google'` \| `'none'` según el/los proveedor(es) de auth vinculados a un email (prioriza `'email'` si ambos existen)
- `protect_profile_is_admin()` — trigger `BEFORE INSERT` y `BEFORE UPDATE OF is_admin` en `profiles` (SECURITY INVOKER — nunca SECURITY DEFINER, ver comentario en la migración `31_profiles_is_admin.sql`). Rechaza la escritura (`RAISE EXCEPTION`) salvo que `current_user` sea `postgres`, `service_role` o `supabase_admin`. El predicado usa `current_user`, no `auth.role()` (devuelve `NULL` en psql/CLI directo) ni `session_user` (siempre `authenticator` vía PostgREST, no distingue roles)
- `is_admin()` — RPC `SECURITY DEFINER STABLE`, devuelve `is_admin` del perfil de `auth.uid()` (`false` si no hay sesión o fila). Aún no está aplicada a ninguna policy de RLS existente — helper listo para uso futuro
- `admin_list_created_users(p_page, p_page_size)` — RPC `SECURITY DEFINER`, `SET search_path = pg_catalog, public, auth`. Devuelve una página de cuentas creadas desde el módulo admin (`profiles.created_by IS NOT NULL`), ordenada `created_at DESC, id DESC`, uniendo `auth.users` para el email (no accesible al rol `authenticated` vía PostgREST) y auto-uniendo `profiles` (LEFT JOIN) para el nombre del admin creador. Cada fila repite el conteo total en `total_count` vía `count(*) OVER ()`, así una página y su total llegan en un solo round-trip. **El chequeo de autorización vive DENTRO de la función** (`IF NOT public.is_admin() THEN RAISE EXCEPTION`), reutilizando el helper de la migración 31 — no es defensa en profundidad, es la única defensa: `SECURITY DEFINER` se salta RLS por completo, y `EXECUTE` se otorga a `PUBLIC` por defecto en toda función nueva de Postgres (de ahí el `REVOKE ... FROM PUBLIC` explícito antes de otorgarlo a `authenticated`). Mover o debilitar esa primera línea expone el email de toda cuenta creada por un admin. `lib/admin/queries.ts:fetchAdminCreatedUsers` deliberadamente NO re-verifica `is_admin` en código de app — a diferencia de `createUserAsAdmin()`, que usa el cliente service-role y por eso no tiene ningún gate propio en la base de datos

> `increment_class_views` **no existe todavía** como RPC — es trabajo pendiente, ver `docs/TASKS.md` §6.2. No lo trates como implementado.

### Storage
Bucket `class-images` (público, lectura pública). Path de upload/borrado restringido a `<user-id>/...` — solo el dueño de la carpeta puede subir y borrar (política sobre `storage.objects`).

---

## Autenticación

### Flujos implementados

#### Registro con correo
1. `/registro` — usuario elige rol (sin pre-selección) → llena nombre/correo/contraseña
2. Supabase envía email de confirmación
3. `/confirmar-email` — muestra instrucciones de verificación
4. Al confirmar el link → `/auth/callback?next=/clases` (alumno) o `?next=/onboarding` (profesor/academia)

#### Registro con Google desde `/registro`
1. Usuario elige rol → clic en "Registrarme como X con Google"
2. Google OAuth → `/auth/callback?role=profesor` (rol en URL)
3. Callback aplica el rol directamente en la DB
4. Nuevo usuario → `/clases` (alumno) o `/onboarding` (profesor/academia)

#### Login con Google desde `/login` (usuario nuevo)
1. Google OAuth sin rol previo → `/auth/callback`
2. Callback detecta nuevo usuario (`|last_sign_in_at - created_at| < 60s`)
3. Redirige a `/completar-registro`
4. Usuario elige rol → se guarda en DB → `/clases` o `/onboarding`

#### Login normal (usuario existente)
1. `/login` → email/contraseña o Google
2. Callback o `redirectByRole` determina destino según `profiles.role`
3. `alumno` → `/clases`, `profesor`/`academia` → `/dashboard`

#### Recuperación de contraseña
1. `/login` → solicitar reset → Supabase envía email
2. Link del email → `/reset-password`
3. Nueva contraseña → `redirectByRole` envía al destino correcto

### Protección de rutas
`proxy.ts` (Next.js 16) intercepta todas las requests. Rutas protegidas:
- `/dashboard/*`
- `/onboarding`
- `/completar-registro`

Sin sesión → redirige a `/login`.

### Archivos clave de auth
| Archivo | Rol |
|---------|-----|
| `proxy.ts` | Intercepta requests, refresca sesión, protege rutas |
| `app/auth/callback/route.ts` | Route Handler OAuth + email confirm |
| `lib/supabase/server.ts` | Cliente Supabase para RSC y Server Actions |
| `lib/supabase/client.ts` | Cliente Supabase para Client Components |
| `lib/auth/redirectByRole.ts` | Utilidad compartida: lee role y redirige |

---

## Páginas y rutas

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Home con clases destacadas, profesores y academias |
| `/clases` | Listado de clases con filtros |
| `/clases/[id]` | Detalle de clase con modal de contacto |
| `/profesores/[id]` | Perfil público de profesor o academia |

### Autenticación
| Ruta | Descripción |
|------|-------------|
| `/registro` | Registro con selección de rol obligatoria |
| `/login` | Login con email o Google |
| `/confirmar-email` | Pantalla post-registro (verificación pendiente) |
| `/completar-registro` | Selección de rol post-OAuth (solo usuarios nuevos sin rol) |
| `/reset-password` | Cambio de contraseña via enlace de email |

### Protegidas (requieren sesión)
| Ruta | Descripción |
|------|-------------|
| `/onboarding` | Configuración inicial para profesores/academias (4 pasos) |
| `/dashboard` | Dashboard principal (resumen de métricas) |
| `/dashboard/mis-clases` | Listado de clases propias con acciones |
| `/dashboard/crear-clase` | Formulario completo de creación de clase |
| `/dashboard/perfil` | Edición del perfil público |
| `/dashboard/alumno` | Vista de clases guardadas (rol alumno) |
| `/dashboard/configuracion` | Configuración de cuenta |

### Redirects configurados
- `/buscar` → `/clases`
- `/clase/:id` → `/clases/:id`

---

## Componentes compartidos

| Componente | Descripción |
|------------|-------------|
| `Header` | Navegación principal con estado de auth (skeleton mientras carga) |
| `ClassCard` | Tarjeta de clase para listados |
| `FilterPanel` | Panel de filtros en `/clases` |
| `ContactModal` | Modal de contacto externo (WhatsApp / Instagram / Web) |
| `AuthErrorBanner` | Banner de error de autenticación |

---

## Capa de datos

Organizada por feature slice bajo `lib/`, no como un par plano `queries`/`actions`:

| Archivo | Rol |
|---------|-----|
| `lib/supabase/server.ts` | Cliente Supabase para RSC / Server Actions / Route Handlers |
| `lib/supabase/client.ts` | Cliente Supabase para Client Components |
| `lib/types.ts` | Tipos de dominio compartidos |
| `lib/auth/actions.ts`, `lib/auth/redirectByRole.ts` | Mutaciones `'use server'` de auth + redirect post-login/onboarding según rol |
| `lib/catalog/queries.ts`, `lib/catalog/lookups.ts` | Queries de lectura + helpers de lookup para `dance_styles` / `class_levels` |
| `lib/classes/queries.ts`, `lib/classes/actions.ts`, `lib/classes/helpers.ts`, `lib/classes/types.ts` | Queries de lectura de clases, mutaciones `'use server'` (crear/actualizar/eliminar), helpers y tipos propios de clases |
| `lib/profiles/queries.ts`, `lib/profiles/actions.ts` | Queries de lectura de perfiles + mutaciones `'use server'` |
| `lib/stats/queries.ts` | Queries de lectura para dashboard/estadísticas |
| `lib/utils.ts` | Funciones utilitarias compartidas |

Los Server Actions siempre verifican `supabase.auth.getUser()` antes de ejecutar — nunca confían en IDs provistos por el cliente para checks de ownership.

---

## Tipos principales

```typescript
type ClassType    = 'clase' | 'taller' | 'curso' | 'masterclass' | 'evento' | 'clase-suelta'
type ClassStatus  = 'published' | 'draft' | 'finished' | 'archived'
type Modality     = 'Presencial' | 'Online'
type PriceType    = 'Gratis' | 'Por clase' | 'Mensual' | 'Paquete'

interface DanceClass { ... }   // lib/types.ts
interface Teacher    { ... }   // lib/types.ts
interface TimeSlot   { ... }   // lib/types.ts
```

### Convención de mapeo
La DB usa `snake_case`. Todo el código TypeScript usa `camelCase`. Cada feature slice (`lib/classes/queries.ts`, `lib/profiles/queries.ts`, `lib/catalog/queries.ts`, etc.) es dueño de su propio mapeo DB → TS — no hay un único mapper central.

---

## Convenciones de código

- Client Components colocados junto a su ruta con sufijo `*Client.tsx` (ej. `ClaseDetailClient.tsx`)
- Componentes compartidos en `components/`
- Server Actions siempre llaman `supabase.auth.getUser()` primero — nunca confían en IDs del cliente
- `getUser()` (JWT verificado server-side) en lugar de `getSession()` en todos los contextos de servidor

---

## Objetivo del producto

Kynea busca ser **el directorio de referencia de clases de danza en Perú**: el lugar donde cualquier persona encuentra clases de baile cerca de su ubicación, y donde profesores y academias tienen presencia profesional digital sin necesidad de conocimientos técnicos.

### Propuesta de valor por rol

**Para alumnos:** encontrar clases de baile reales, con información completa (horarios, precios, nivel, modalidad, ubicación) y contactar directamente al profesor en un clic.

**Para profesores y academias:** tener una página de perfil profesional y publicar clases con toda la información relevante, visible para miles de personas que buscan aprender a bailar.

### Visión a mediano plazo
- Cobertura nacional (Lima como mercado inicial, expansión a Arequipa, Cusco, Trujillo)
- Búsqueda geolocalizada: "clases cerca de mí"
- Perfiles verificados para generar confianza
- Estadísticas reales para profesores: cuántas personas vieron su clase, cuántos la guardaron, cuántos la contactaron
- Motor de descubrimiento personalizado: recomendaciones basadas en estilos de interés del alumno
