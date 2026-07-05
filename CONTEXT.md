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

### Tablas actuales

#### `profiles`
Extiende `auth.users`. Se crea automáticamente via trigger `handle_new_user` al registrarse.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | FK → auth.users |
| `role` | text | `alumno` \| `profesor` \| `academia` |
| `name` | text | Nombre público |
| `photo_url` | text | URL de foto de perfil |
| `bio` | text | Descripción pública |
| `city` | text | Ciudad |
| `district` | text | Distrito |
| `years_experience` | integer | Años de experiencia |
| `whatsapp` | text | Número de contacto |
| `instagram` | text | Handle de Instagram |
| `tiktok` | text | Handle de TikTok |
| `youtube` | text | Canal de YouTube |
| `website` | text | URL de sitio web |
| `dance_styles` | text[] | Estilos que enseña |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | Se actualiza en cada mutación |

#### `classes`
Clases publicadas por profesores y academias.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `teacher_id` | uuid | FK → profiles |
| `type` | text | `clase` \| `taller` \| `curso` \| `masterclass` \| `evento` \| `clase-suelta` |
| `title` | text | Título de la clase |
| `style` | text | Estilo principal de baile |
| `secondary_styles` | text[] | Estilos secundarios |
| `level` | text | Nivel de dificultad |
| `short_description` | text | Descripción corta (listados) |
| `full_description` | text | Descripción completa (detalle) |
| `what_you_learn` | text[] | Lista de aprendizajes |
| `for_whom` | text | A quién va dirigido |
| `requirements` | text | Requisitos previos |
| `start_date` | date | Fecha de inicio |
| `end_date` | date | Fecha de fin (opcional) |
| `time_slots` | jsonb | Horarios: `[{days, startTime, endTime}]` |
| `price_type` | text | `Gratis` \| `Por clase` \| `Mensual` \| `Paquete` |
| `price` | numeric | Precio |
| `offer_price` | numeric | Precio con descuento (opcional) |
| `currency` | text | `PEN` (default) |
| `max_spots` | integer | Cupo máximo |
| `available_spots` | integer | Cupos disponibles |
| `is_trial_free` | boolean | Si la primera clase es gratis |
| `modality` | text | `Presencial` \| `Online` |
| `city` | text | Ciudad |
| `district` | text | Distrito |
| `venue_name` | text | Nombre del local |
| `address` | text | Dirección |
| `reference` | text | Referencia de ubicación |
| `maps_url` | text | Link de Google Maps |
| `lat` / `lng` | float | Coordenadas geográficas |
| `platform` | text | Plataforma online (Zoom, Meet, etc.) |
| `access_link` | text | Enlace de acceso online |
| `cover_image` | text | URL de imagen principal |
| `gallery` | text[] | URLs de galería adicional |
| `video_url` | text | URL de video de presentación |
| `footwear` | text | Calzado requerido |
| `clothing` | text | Vestimenta requerida |
| `to_bring` | text[] | Lista de qué llevar |
| `age_group` | text | Grupo etario |
| `prerequisites` | text | Prerrequisitos |
| `contact_mode` | text | `whatsapp` \| `instagram` \| `web` |
| `status` | text | `draft` \| `published` \| `finished` \| `archived` |
| `views` | integer | Contador de vistas |
| `contacts` | integer | Contador de contactos (via función RPC) |
| `saved_count` | integer | Contador de guardados |
| `created_at` | timestamptz | — |
| `published_at` | timestamptz | — |
| `updated_at` | timestamptz | — |

Índices: `status`, `teacher_id`, `style`.

#### `saved_classes`
Bookmarks de alumnos. PK compuesta `(user_id, class_id)`.

### RLS
Todas las tablas tienen Row Level Security activado:
- `profiles`: lectura pública, escritura solo al propio perfil
- `classes`: publicadas son públicas; el profesor gestiona solo las suyas
- `saved_classes`: cada usuario solo ve y modifica los suyos

### Funciones / Triggers
- `handle_new_user()` — trigger AFTER INSERT en `auth.users`, crea el profile automáticamente
- `increment_class_contacts(class_id)` — RPC para incrementar contador sin race condition (SECURITY DEFINER)

### Storage
Bucket `class-images` (público). Path de upload: `<user-id>/<filename>`. Solo el dueño puede subir y borrar.

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

### Queries (lectura)
`lib/queries/classes.ts` — funciones de lectura que mapean snake_case DB → camelCase TypeScript:
- `fetchFeaturedProfiles()` — profesores y academias destacados para el home
- `fetchTeacherById(id)` — perfil completo de un profesor/academia
- Mappers: `mapDbClassToType()`, `mapTeacher()`

### Server Actions (escritura)
`lib/actions/classes.ts` — siempre verifican `getUser()` antes de ejecutar:
- `createClass(formData)` — crea clase y redirige a mis-clases
- `updateClass(classId, updates)` — actualización parcial
- `updateClassFromForm(classId, formData)` — actualización completa desde formulario
- `deleteClass(classId)` — elimina clase propia
- `duplicateClass(classId)` — duplica como borrador
- `updateProfile(updates)` — actualiza perfil propio
- `completeOAuthRegistration(role)` — asigna rol post-OAuth (solo desde `/completar-registro`)

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
La DB usa `snake_case`. Todo el código TypeScript usa `camelCase`. Los mappers en `lib/queries/classes.ts` son la única fuente de verdad para esta traducción.

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
