# Kynea — Funcionalidades y Tareas para Desarrollador

> Documento de handoff. Refleja el **estado real** de la plataforma auditado contra el código
> (última revisión: 2026-06-23). Léelo completo antes de tocar nada.

## Qué es Kynea

Marketplace de clases de baile en Perú (Lima) que conecta profesores y academias con
alumnos. La plataforma **solo conecta**: el alumno descubre clases y hace clic en el
botón de WhatsApp/Instagram del profesor, que lo redirige fuera de la app. Toda la
negociación (precio, cupos, pago, coordinación) ocurre **fuera de la plataforma**, en
ese canal externo. No hay inscripciones, pagos ni mensajería dentro de Kynea.

Stack: **Next.js 16 + Supabase + Tailwind CSS v4**, desplegado en Vercel
(`https://kynea-life.vercel.app`).

> ⚠️ **Next.js 16 tiene breaking changes** respecto a versiones previas (ej. el
> middleware vive en `proxy.ts`, `cookies()` es async). Antes de escribir código, lee
> las guías en `node_modules/next/dist/docs/`. No asumas APIs de memoria.

---

## ✅ Ya resuelto (desde el último análisis)

Los siguientes ítems estaban pendientes en la versión anterior de este documento y **ya
están implementados** en el código actual:

- **Google OAuth completo** — botones en registro/login, callback en `app/auth/callback/route.ts`,
  flujo `/completar-registro` para usuarios nuevos vía Google, `lib/auth/actions.ts`
  (`completeOAuthRegistration`), helper `lib/auth/redirectByRole.ts`.
- **Upload de foto del profesor** — file upload real a Supabase Storage (`class-images`) desde
  `app/dashboard/perfil/PerfilClient.tsx`; ya no es un input de URL.
- **RPC de contactos** — `increment_class_contacts` existe en
  `supabase/migrations/20260705000080_08_rpc_functions.sql` y se
  llama desde `app/clases/[id]/ClaseDetailClient.tsx` al tocar WhatsApp/Instagram.
- **Mapa con datos reales** — `app/mapa/page.tsx` usa `fetchPublishedClasses()` y filtra por
  `lat/lng != null`; `lib/mockData.ts` fue borrado (0 referencias restantes).
- **Refactor `lib/` por dominio (Feature Module Pattern)** — `lib/classes/`, `lib/profiles/`,
  `lib/auth/`, `lib/catalog/`, `lib/stats/`; los archivos god `lib/queries/classes.ts` y
  `lib/actions/classes.ts` fueron borrados. Filtrado de `/clases` ahora es server-side.
- **Páginas legales** — `/terminos` (Términos y condiciones) y `/terminos-publicacion` (Reglas de
  publicación para profesores).
- **Rate limiting híbrido (Upstash Redis + UX de Frontend)** — `lib/ratelimit.ts`, rate limit por IP en `proxy.ts` para rutas de autenticación (omitiendo prefetch), límites en Server Actions (`uploadClassImage`, `uploadProfileImage`, `createClass`), cooldowns de 60s en `/confirmar-email` y `/login`, y deduplicación por sesión para contadores de vistas y contactos.
- **SEO para Google Sitelinks y Datos Estructurados JSON-LD** — Esquemas `WebSite` (con SearchAction), `Organization`, `SiteNavigationElement` (Sitelinks principales) y `FAQPage` (People Also Ask) en `app/page.tsx`, `metadataBase` en `app/layout.tsx`, y metadatos dedicados en `app/login/layout.tsx` y `app/registro/layout.tsx`.
- **NoticeBar** — `app/dashboard/NoticeBar.tsx`: modal de aviso `cuenta_existente` que se activa
  cuando un usuario OAuth intenta registrarse con un rol distinto al que ya tiene.

---

## Estado actual

### ✅ Funciona
- Registro y Login con email + contraseña
- **Google OAuth** — registro y login con Google (ver ✅ arriba)
- Recuperación de contraseña (email con link → `/auth/callback` → `/reset-password`)
- Onboarding de 4 pasos para profesor / academia (con foto upload)
- Publicación de clases (formulario completo: media, horarios, precios, ubicación)
- Catálogo público: listado con filtros server-side, detalle de clase, perfil del profesor
- Guardar clases como favorito (alumno)
- Dashboard del alumno: clases guardadas
- Dashboard del profesor/academia: mis clases, crear/editar/archivar/duplicar
- **Contacto al profesor**: botón con gate de registro → redirige a WhatsApp/Instagram
  (el `ContactModal` actúa como gate de registro; al contactar se incrementa `contacts_count`)
- Middleware (`proxy.ts`) que exige login en `/dashboard`, `/onboarding`, `/completar-registro`

### ⚠️ Pendiente o incompleto (prioridad de corrección)
- **Confirmación de email: approach sin definir.** El callback de link y la pantalla de código OTP
  coexisten; falta elegir uno y configurar la plantilla de Supabase. Ver **1.1**.
- ~~**Protección de rutas por rol: ROTA.**~~ RESUELTO — ver **1.3**.
- **Contador de vistas: siempre en 0.** `classes.views_count` nunca se incrementa. Ver **6.2**.
- **Sort "Recomendados/Menor precio": cosmético.** El `<select>` de ordenamiento en `/clases`
  no aplica ningún `.sort()`. Ver **5.1**.

### Archivos clave

> **Patrón Feature Module:** `lib/` está organizado por dominio, no por capa.
> Cada módulo tiene `queries.ts` (lecturas) y/o `actions.ts` (escrituras, `'use server'`).

| Archivo | Qué hace |
|---------|----------|
| `lib/supabase/server.ts` | Cliente Supabase para Server Components / Actions |
| `lib/supabase/client.ts` | Cliente Supabase para Client Components |
| `lib/classes/queries.ts` | Fetch de clases (`fetchPublishedClasses` con filtros server-side, `fetchClassById`, `fetchTeacherClasses`, `fetchSavedClasses`) |
| `lib/classes/actions.ts` | Mutaciones de clases (`createClass`, `updateClassFromForm`, `deleteClass`, `duplicateClass`) |
| `lib/classes/helpers.ts` | `buildClassColumns`, `createVenue`, `insertClassStyles`, `insertClassSchedules` |
| `lib/classes/types.ts` | `ClassFilters`, `ClassUpdatePayload`, tipos DB (`DbClassRow`, etc.) |
| `lib/profiles/queries.ts` | `mapTeacher`, `fetchFeaturedProfiles`, `fetchTeacherById` |
| `lib/profiles/actions.ts` | `updateProfile` |
| `lib/auth/actions.ts` | `completeOAuthRegistration` |
| `lib/auth/redirectByRole.ts` | Helper de redirección por rol tras login |
| `lib/catalog/queries.ts` | `fetchDanceStyles`, `fetchClassLevels` |
| `lib/catalog/lookups.ts` | `lookupLevelId`, `lookupStyleId` |
| `lib/stats/queries.ts` | `HomeStats`, `fetchHomeStats` |
| `lib/types.ts` | Tipos TypeScript del proyecto (`DanceClass`, `Teacher`, etc.) |
| `supabase/migrations/*.sql` | Schema versionado (14 migraciones: 00_reset … 13_grants) |
| `proxy.ts` | Middleware de autenticación (Next.js 16: nombre `proxy.ts`, función `proxy`) |

---

## 1. AUTH Y SEGURIDAD

### 1.1 🟡 Confirmación de email — elegir un approach y configurar Supabase

**Estado actual (verificado):** El código soporta **dos caminos en paralelo** que no se contradicen
técnicamente, pero es ambiguo cuál es el oficial:

- `app/registro/page.tsx` hace `signUp()` con `emailRedirectTo` **y** manda al usuario a
  `app/confirmar-email/page.tsx` (que pide código de 6 dígitos con `verifyOtp`).
- `app/auth/callback/route.ts` maneja el link de confirmación con `exchangeCodeForSession(code)`.
- Si Supabase está configurado para mandar el email por defecto (link), el usuario llega por el
  callback y nunca necesita la pantalla de código.

**Tareas pendientes:**
1. **Decidir el approach** — OTP de 6 dígitos (más resistente a pre-escaneo de Gmail) vs link.
2. **Si se elige OTP:** configurar la plantilla en Supabase → Authentication → Email Templates →
   "Confirm signup" para que envíe `{{ .Token }}` (sin `{{ .ConfirmationURL }}`). Quitar
   `emailRedirectTo` del `signUp()` en `app/registro/page.tsx`.
3. **Si se elige link:** quitar la pantalla `/confirmar-email` y el `verifyOtp`.
4. **Documentar** la decisión en `docs/DEPLOY.md`.

**Archivos:** `app/registro/page.tsx`, `app/confirmar-email/page.tsx`,
`app/auth/callback/route.ts`, Supabase Dashboard, `docs/DEPLOY.md`.

### 1.2 ✅ Google OAuth — ya completo

Botones en registro y login, callback en `app/auth/callback/route.ts`, flujo
`/completar-registro` para usuarios nuevos sin rol, `lib/auth/actions.ts`.
**Solo falta:** activar el provider en Supabase (Authentication → Providers → Google) con
Client ID/Secret de Google Cloud Console, y autorizar el callback en Google Console. Es config,
no código.

### 1.3 ✅ Protección de rutas por rol — RESUELTO

**Problema (ya corregido):** `proxy.ts` verificaba "¿está logueado?" pero no el rol. Un alumno
podía entrar a `/dashboard/crear-clase`, `/dashboard/mis-clases`, `/dashboard/contactos`, etc.

**Solución:** nuevo helper server-only `lib/auth/requireRole.ts` (distinto de
`lib/auth/redirectByRole.ts`, que es client-side y no sirve para RSC). Se llama al inicio de
cada server component exclusivo de profesor/academia y redirige al alumno a `/dashboard/alumno`.

**Archivos:** `app/dashboard/mis-clases/page.tsx`, `app/dashboard/crear-clase/page.tsx`,
`app/dashboard/contactos/page.tsx` (profesor+academia); `app/dashboard/profesores/page.tsx`
(solo academia); `app/dashboard/importar-csv/page.tsx` (profesor+academia). Estas dos últimas
eran Client Components puros sin wrapper de servidor — se dividieron en `page.tsx` (server,
hace el check) + `ProfesoresClient.tsx`/`ImportarCSVClient.tsx` (la UI existente, renombrada
según la convención `*Client.tsx` del repo).

### 1.4 ⬜ Validación del lado servidor (Zod)

`createClass` en `lib/classes/actions.ts` y `updateProfile` en `lib/profiles/actions.ts`
insertan en la DB sin validar. `package.json` no tiene `zod`.

**Tarea:** instalar `zod`, definir schemas en `lib/classes/types.ts` y
`lib/profiles/actions.ts`, validar: `price` > 0, `title` 5–100 caracteres,
`end_date` posterior a `start_date`, etc.

### 1.5 ⬜ Política de contraseñas

Añadir indicador de fortaleza en `app/registro/page.tsx` y subir el mínimo a 8 caracteres
en Supabase → Auth → Settings.

### 1.6 ⬜ Cambio de correo electrónico conservando la cuenta
Ver detalle completo de diseño, arquitectura y seguridad contra Account Takeover en **9.2**.

---

## 2. ONBOARDING — LOS 3 ROLES

### 2.1 ⬜ Onboarding del Alumno (no existe)

El alumno se registra y va directo a `/clases`; su perfil queda vacío. No existe
`app/onboarding-alumno/`. **Tarea:** crear 2–3 pasos ligeros (estilos de interés, distrito,
nivel) y cambiar el destino post-registro del alumno a `/onboarding-alumno`.

### 2.2 🟡 Onboarding del Profesor — mejoras parciales

**Hecho:** upload de foto a Storage (`handlePhotoUpload`), validación de contacto (WhatsApp o
Instagram requerido). **Pendiente:** validar que los campos marcados con `*` no estén vacíos
antes de avanzar de paso (pasos 0 y 2 no validan).

**Archivo:** `app/onboarding/page.tsx`.

### 2.3 ⬜ Onboarding de la Academia — diferenciación

Confirmado: el wizard es idéntico al del profesor salvo el label del nombre. Diseño
finalizado en la sección **8** (Flujo de Academias) — campos propios: RUC (opcional) +
dirección principal vía `venues.is_primary`. Sin campo de "número de profesores": el
roster de profesores por academia queda diferido (ver 8.8).

---

## 3. PERFIL — LOS 3 ROLES

### 3.1 ⬜ Perfil del Alumno — pantalla incorrecta

El alumno ve `app/dashboard/perfil/PerfilClient.tsx` (diseñado para profesores: años de
experiencia docente, estilos que enseña, redes sociales). `page.tsx` no detecta el rol.

**Tarea:** crear `PerfilAlumnoClient.tsx` con campos propios (nombre, foto, ciudad/distrito,
estilos favoritos, nivel, bio corta). En `page.tsx`, leer `profile.role` y renderizar el
cliente correcto.

### 3.2 ✅ Perfil del Profesor — upload de foto

Ya es un file upload real a Supabase Storage (`class-images`, max 2 MB).
Ver `PerfilClient.tsx:79-98`. **Pendiente menor:** `profiles.total_classes` nunca se actualiza
(ver 11.3).

### 3.3 ⬜ Perfil de la Academia — campos propios

La tabla `profiles` no tiene columnas específicas de academia. `updateProfile` en
`lib/profiles/actions.ts` no diferencia roles. Diseño finalizado en **8.1**: `profiles.ruc`
+ dirección vía `venues.is_primary` — no se duplica el concepto de dirección en `profiles`,
que fue eliminado a propósito en la migración 25 (`20260727000000_25_venues_denormalize_location_drop_districts.sql`).

---

## 4. CREACIÓN Y GESTIÓN DE CLASES

### 4.1 🟡 Validaciones del formulario

**Estado actual:** solo hay restricciones HTML (`maxLength`, `min={0}`) en
`app/dashboard/crear-clase/CrearClaseForm.tsx`. En `lib/classes/actions.ts` (`createClass`) y
`lib/classes/helpers.ts` (`buildClassColumns`) no hay validación de negocio: precio cae a `0`
si es inválido, no se validan fechas ni horarios.

**Tarea:** validación Zod en `createClass` / `lib/classes/helpers.ts` + mensajes de error
inline en el formulario. Depende de instalar Zod (ver 1.4).

### 4.2 ⬜ Google Maps en la dirección de la clase

`CrearClaseForm.tsx:630` tiene un `// TODO: Google Places Autocomplete`. La dirección es un
input de texto plano. Las columnas `lat`, `lng`, `maps_url` existen en la **tabla `venues`**
(no en `classes`) pero `createVenue` en `lib/classes/helpers.ts` no las llena.

**Tarea:** agregar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, integrar Places Autocomplete en el campo
de dirección y guardar `lat`/`lng` en `venues`. Esto alimenta el mapa (6.1).

### 4.3 ✅ Estado "finalizada" para clases vencidas

**Opción A implementada:** `fetchPublishedClasses` (`lib/classes/queries.ts`) ahora filtra
`.or('end_date.is.null,end_date.gte.today')` — una clase con `end_date` vencido deja de listarse
en Home/`/clases`/mapa/sitemap. Sigue accesible por link directo vía `fetchClassById` (no
touched), y el status en DB sigue siendo `'published'` (no se reescribe).

El status `'finished'` existe en el schema (`supabase/migrations/20260705000050_05_classes.sql`,
CHECK incluye `'finished'`) pero sigue sin usarse automáticamente — **pendiente opción B:**
trigger SQL que cambie el status a `finished` cuando `end_date < now()`, si en algún momento se
necesita que el estado en DB refleje esto (ej. para que el profesor vea "finalizada" en Mis
Clases, o para excluirla de `fetchTeacherClasses`).

**Impacto en SEO encontrado el 2026-09-01, auditando producción vía Search Console:** de 163
clases en prod, **94 (58%) tienen `end_date` vencido** pero siguen con `status='published'` — el
link directo vive fuera del sitemap/listados (opción A) pero sin ningún `noindex`, así que quedan
huérfanas y aun así indexables: Google las había indexado cuando estaban activas, dejaron de tener
enlaces internos, y terminan como "excluida, sin motivo claro" en Search Console (~112 páginas en
ese estado el día de la auditoría). Se agregó `robots: { index: false, follow: true }` en
`generateMetadata` de `app/[categoria]/[tipo]/[slug]/page.tsx` cuando `endDate` ya pasó — soluciona
esto sin tocar la DB ni la opción B de arriba. Mismo patrón aplicado a
`app/categorias/[slug]/page.tsx` para las categorías sin ninguna clase (36 de 60 estilos del
catálogo no tienen ninguna clase asociada — contenido vacío, nunca debieron ser indexables).

**Pendiente de decisión de producto, no aplicado:** de 82 perfiles (78 profesores + 4 academias),
solo 22 tienen una clase activa hoy; **26 nunca publicaron ninguna clase** (ni vencida) y los 82
están en el sitemap sin filtrar. No se les puso `noindex` — a diferencia de una clase vencida o una
categoría vacía, un perfil sí puede tener contenido real (bio, foto, redes) aunque no tenga clases,
así que es una decisión de negocio (¿noindexar perfiles fantasma? ¿priorizar que publiquen su
primera clase?) más que un bug técnico claro.

### 4.4 ⬜ Importación CSV — implementar el parseo

`app/dashboard/importar-csv/page.tsx` usa `MOCK_PREVIEW` hardcodeado. El `handleFileDrop`
ignora el archivo real. No hay `papaparse` en `package.json`.

**Tarea:** instalar `papaparse`, parsear el archivo, preview real, inserción en lote vía
`createClass`. Definir y documentar primero las columnas requeridas.

---

## 5. DESCUBRIMIENTO Y BÚSQUEDA

### 5.1 🟡 Filtros y ordenamiento

**Server-side (funciona):** estilos, niveles, días, ciudad, modalidad, tipo, `withSpots`,
búsqueda por título (`ilike`). Implementado en `lib/classes/queries.ts:fetchPublishedClasses`.

**Client-side parcial:** rango de precio por buckets (`FilterPanel.tsx:PRICE_RANGES`), franja
horaria (mañana/tarde/noche). Se aplican después del fetch en `ClasesContent.tsx`.

**Pendiente:**
- **Sort: cosmético.** El `<select>` de ordenamiento en `ClasesContent.tsx` tiene estado `sortBy`
  pero **no aplica `.sort()`** al array `results`. Las opciones actuales son "Recomendados /
  Menor precio / Próximamente / Mejor disponibilidad" — ninguna funciona.
- **Filtro `is_trial_free`**: el campo se mapea en el tipo pero no hay filtro por prueba gratis.
- **Rango de precio libre** (min/max) en servidor.

**Nota:** `app/buscar/page.tsx` existe pero es solo un redirect a `/clases` preservando query string.

### 5.2 ⬜ Paginación del catálogo

`fetchPublishedClasses` devuelve todas las clases sin límite (sin `.range()`). Con muchas clases
se vuelve lento. **Tarea:** `limit`/`offset` con `.range()` de Supabase + "Cargar más" en
`app/clases/page.tsx`.

### 5.3 ✅ SEO — metadata dinámica

**Desactualizado — ya implementado.** `app/[categoria]/[tipo]/[slug]/page.tsx` y
`app/profesores/[slug]/page.tsx` exportan `generateMetadata` (título, descripción, canonical, Open
Graph), y ambos tienen JSON-LD (`Course` y `Person`/`Organization` respectivamente) con datos
reales. `/clases`, `/profesores` y `/categorias/[slug]` también. Sitemap dinámico en
`app/sitemap.ts` y `app/robots.ts` correctos. Auditado y verificado en vivo el 2026-09-01 — ver el
hallazgo de indexación real en 4.3 (clases vencidas y categorías vacías quedaban indexables sin
`noindex`, ya corregido).

**Pendiente, menor:** meta tags de Twitter Card (no existen en ningún lado), `BreadcrumbList`/
`ItemList` en las páginas de listado, imagen OG en Home, y `lastModified` en las entradas de perfil
del sitemap (`app/sitemap.ts` — `teacherEntries` no lo setea, a diferencia de `classEntries`).

---

## 6. MAPA Y VISTAS

### 6.1 🟡 Mapa de clases — Google Maps real

**Hecho:** `app/mapa/page.tsx` usa `fetchPublishedClasses()` y filtra por `lat/lng != null`.
No hay dependencia de mockData.

**Pendiente:** `app/mapa/MapaClient.tsx` sigue siendo un **placeholder SVG** (gradiente CSS +
grid + pines con posición calculada con proyección lineal casera). No usa Google Maps ni ningún
servicio real de mapas. Tampoco lee `searchParams` para pre-filtrar por ciudad/estilo.

**Tarea:** instalar `@react-google-maps/api` + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (la misma de
4.2), reemplazar el SVG por un `<GoogleMap>` real con `<Marker>` en `venue.lat`/`venue.lng`.
Clic en marcador → tarjeta con link al detalle. Clases sin coordenadas no aparecen (de ahí la
importancia de 4.2).

**Nota:** las coordenadas viven en la tabla **`venues`** (columnas `lat`, `lng`, `maps_url`),
no directamente en `classes`.

### 6.2 🔴 Incremento de vistas al abrir una clase

`classes.views_count` siempre es 0; el RPC `increment_class_views` no existe en schema ni en
código. El dashboard de métricas y la tasa de conversión quedan inservibles.

**Tarea:** crear la función SQL y llamarla desde el server component del detalle:

```sql
create or replace function increment_class_views(class_id uuid)
returns void language sql security definer as $$
  update public.classes set views_count = views_count + 1
  where id = class_id and status = 'published';
$$;
```

En `app/clases/[id]/page.tsx` (server component), tras obtener la clase, llamar
`supabase.rpc('increment_class_views', { class_id: id })`.

---

## 7. CONTACTO CON EL PROFESOR — parcialmente completo

**Hecho:** `increment_class_contacts` existe en
`supabase/migrations/20260705000080_08_rpc_functions.sql` y se llama desde
`app/clases/[id]/ClaseDetailClient.tsx` (botones WhatsApp/Instagram, solo si el usuario está
logueado). El `ContactModal` actúa como gate de registro para no logueados.

**Pendiente menor:** `components/ClassCard.tsx` y `components/ContactModal.tsx` **no** llaman al
RPC `increment_class_contacts`. Si se quiere paridad de métricas entre la tarjeta y el detalle,
añadir la RPC también en la tarjeta.

**No construir:** inscripciones, cupos automáticos, formularios de contacto, mensajería interna.
La coordinación ocurre fuera de la plataforma.

---

## 8. FLUJO DE ACADEMIAS — registro, conversión y aprobación

> Diseño acordado el 2026-08-18, reemplaza el plan anterior de esta sección (roster de
> profesores) — esa idea queda diferida, ver **8.8**. Implementado el 2026-08-19
> (migración 39 ya aplicada a `kynea-dev`). **Falta probar en vivo el circuito completo
> de aprobación** (8.6) — necesita una cuenta con `is_admin = true`, que solo se puede
> otorgar por conexión directa a la base; quien retome esto debería aprobar/rechazar al
> menos una solicitud real antes de mergear a producción.

**Decisiones de producto:**
- Para efectos prácticos, una academia es un profesor con un badge distinto — mismo
  dashboard, mismo Crear Clase. Sin roster ni asociación de profesores en esta versión.
- Toda cuenta academia (nueva o convertida) necesita aprobación manual de Kynea antes de
  poder **publicar** clases. El resto de la cuenta (onboarding, configurar perfil, guardar
  borradores) funciona sin restricción desde el día uno — el gate es solo sobre `publicar`.
- Un profesor que solicita convertirse en academia **no sufre ninguna restricción**
  mientras está pendiente: sigue siendo profesor al 100%, sus clases existentes no se
  tocan. El cambio de rol ocurre atómicamente solo al aprobar; si se rechaza, no cambia
  absolutamente nada.

### 8.1 ✅ Modelo de datos

- `profiles.academia_approved_at timestamptz null` — gate de publicación, solo relevante
  cuando `role = 'academia'`.
- `profiles.ruc text null`.
- `venues.is_primary boolean not null default false` + índice único parcial por
  `owner_id` (una sola sede principal por perfil).
- Tabla `academia_requests`:
  ```sql
  create table public.academia_requests (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    kind text not null check (kind in ('signup', 'conversion')),
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    ruc text,
    reviewed_by uuid references public.profiles(id),
    reviewed_at timestamptz,
    created_at timestamptz default now()
  );
  alter table public.academia_requests enable row level security;
  -- el dueño puede crear/ver la suya; solo admin puede aprobar/rechazar
  ```
- Excepción angosta al trigger de rol inmutable
  (`20260731000000_29_protect_profile_role.sql`): permite la transición
  `profesor → academia` únicamente cuando la ejecuta la función de aprobación de admin
  (vía flag de sesión que solo esa función puede setear) — nunca desde un update directo
  del cliente. El trigger sigue bloqueando cualquier otro cambio de rol sin excepción.

### 8.2 ✅ Landing `/academias` — alta directa

Clon de `/unete` con copy propio ("Gestiona tu equipo... publica todas tus clases desde un
solo lugar"), `role: 'academia'` fijo. Al registrarse, crea también su fila en
`academia_requests` (kind: `signup`). Link cruzado desde `/unete` para quien llega
buscando registrar una academia.

### 8.3 ✅ Onboarding — campos propios de academia

Cuando `profileType === 'academia'`: input de RUC (opcional) + el mismo
`PlacesAddressField` que ya usa Crear Clase, guardando un `venue` con `is_primary: true`.
Sin campo de "número de profesores" — no hay roster en esta versión (ver 8.8).

### 8.4 ✅ Gate de publicación

Nuevo guard `assertAcademiaApproved` en `lib/classes/publishGuard.ts`, calcado a
`assertContactChannel`: bloquea únicamente `status: 'published'` cuando
`role === 'academia'` y `academia_approved_at` es nulo. Mismo patrón de banner que el gate
de contacto en `CrearClaseForm.tsx`, más un banner persistente en el dashboard mientras
está pendiente.

### 8.5 ✅ Conversión profesor → academia

Botón en el dashboard del profesor ("¿Diriges una academia? Solicita el cambio") → un
formulario chico (RUC + confirmación) → inserta `academia_requests` (kind: `conversion`).
Cero restricciones al profesor mientras está pendiente.

### 8.6 ✅ Bandeja de solicitudes (admin)

Nueva pantalla bajo `/dashboard/admin` (reusa el gate existente de `fetchIsAdmin()`)
listando solicitudes pendientes de ambos tipos. Aprobar: `signup` → solo marca
`academia_approved_at`; `conversion` → cambia `role` a `academia` y marca
`academia_approved_at` en el mismo paso, vía la excepción de 8.1. Rechazar: no toca nada
más en el perfil.

### 8.7 ✅ Badge visual diferenciado

El perfil público hoy muestra texto plano ("academia de danza") en vez de un badge —
agregar uno de color distinto, mismo patrón que `DashboardSidebar.tsx` ya usa
internamente para el sidebar del dashboard.

### 8.8 🔵 Diferido: roster de profesores por academia

Idea original de esta sección — tabla `academy_teachers`, invitación por email, estados
`invited/active/inactive` — **explícitamente fuera de alcance de esta versión** para
simplificar el lanzamiento. Se retoma cuando la academia necesite asociar profesores de
verdad; el diseño queda documentado por si sirve de punto de partida:

```sql
create table public.academy_teachers (
  academy_id  uuid not null references public.profiles(id) on delete cascade,
  teacher_id  uuid references public.profiles(id) on delete set null,
  email       text not null,
  status      text not null default 'invited'
              check (status in ('invited', 'active', 'inactive')),
  invited_at  timestamptz default now(),
  joined_at   timestamptz,
  primary key (academy_id, email)
);
```

Hasta entonces, ocultar el link "Gestionar profesores" y su stat card del dashboard
(`app/dashboard/page.tsx`), ya que `app/dashboard/profesores/ProfesoresClient.tsx` corre
sobre datos mock (`MOCK_ACADEMY_TEACHERS`) y no persiste nada real — mostrar una función
que no guarda datos a una academia real genera confusión.

---

## 9. CONFIGURACIÓN DE CUENTA

### 9.1 ✅ Cambio de contraseña y eliminar cuenta — RESUELTO

`app/dashboard/configuracion/ConfiguracionClient.tsx` ya implementa:
- **Cambio de contraseña:** `ChangePasswordForm` re-autentica con `signInWithPassword` antes de aplicar `supabase.auth.updateUser({ password })`.
- **Eliminar cuenta:** botón con confirmación y llamada a `deleteAccount()` en `lib/auth/actions.ts` (`supabase.auth.admin.deleteUser(user.id)`). El `ON DELETE CASCADE` de Postgres limpia perfiles y clases asociadas.
- **Toggles de visibilidad:** WhatsApp (`show_whatsapp`) y cupos (`show_spots`) persisten mediante `updateProfile` en `lib/profiles/actions.ts`.

### 9.2 ⬜ Cambio de correo electrónico conservando la cuenta

Permite a un usuario (`alumno`, `profesor` o `academia`) actualizar su dirección de email de acceso sin perder sus datos, clases, favoritos, métricas ni historial.

**Viabilidad y arquitectura del modelo de datos:**
- **Conservación garantizada:** Todas las relaciones (`profiles`, `classes`, `venues`, `saved_classes`, `profile_styles`) dependen exclusivamente del `id: uuid` inmutable de Supabase Auth (`auth.users.id`). Ninguna tabla usa el correo como clave primaria ni foránea.
- **Cero cambios de esquema:** No requiere migraciones DDL ni alteración de tablas en PostgreSQL.

**Flujo y consideraciones de seguridad (por tipo de cuenta):**

1. **Cuentas con Email y Contraseña:**
   - Exige la **contraseña actual** como re-autenticación (`signInWithPassword`) para evitar suplantación en sesiones abiertas.
   - Dispara `supabase.auth.updateUser({ email: nuevoEmail }, { emailRedirectTo: `${origin}/auth/callback?next=/dashboard/configuracion?email_updated=1` })`.
   - Dependiendo de la configuración en Supabase (*Secure email change*):
     - *Activada (Recomendada por seguridad):* Se envía enlace de confirmación a ambos correos (actual y nuevo).
     - *Desactivada:* Se envía enlace de confirmación únicamente al nuevo correo (útil si el correo anterior ya no existe).

2. **Cuentas con Google OAuth (con acceso a su Gmail):**
   - **Prevención crítica de Session Hijacking / Account Takeover:** Si un usuario deja su sesión abierta en un dispositivo compartido (ej. laptop o tablet de la academia), **no se debe permitir crear una contraseña ni cambiar el correo a ciegas**.
   - Se debe exigir prueba de posesión enviando un **código OTP de 6 dígitos** al correo de Google actual (`supabase.auth.signInWithOtp({ email: user.email })`).
   - Una vez validado el código, el usuario define su nueva contraseña para independizar su cuenta de Google.
   - Ya con contraseña propia, procede a cambiar su correo siguiendo el flujo estándar.

3. **Cuentas con Google OAuth (pérdida total y definitiva de acceso a su Gmail):**
   - Caso extremo (ej. correo institucional `@universidad.edu.pe` dado de baja por la universidad).
   - Por principio de seguridad, ningún autoservicio automatizado debe permitir el cambio sin prueba de posesión (para el sistema, un usuario que perdió su correo y un atacante en sesión abierta son indistinguibles).
   - **Ruta de contingencia:** Enlace en la UI a soporte por WhatsApp para validación manual de identidad (verificando el número de WhatsApp o Instagram registrados en su perfil público). Un superadministrador actualiza el correo mediante `supabase.auth.admin.updateUserById(userId, { email, email_confirm: true })`.

**Tareas técnicas a implementar:**
1. **Frontend:** Crear componente `ChangeEmailForm` en `app/dashboard/configuracion/ConfiguracionClient.tsx`.
   - Mostrar correo actual.
   - Detectar si la cuenta es email/password o Google OAuth puro (mediante RPC `email_signup_provider` o `app_metadata.providers`).
   - Para cuentas Google: flujo de envío/validación de código OTP antes de asignar contraseña.
   - Para cuentas email: pedir contraseña actual.
   - Manejo de estados: pendiente de confirmación (`user.new_email`) y banners de alerta.
2. **Rate Limiting:** Añadir `emailChangeRateLimiter` en `lib/ratelimit.ts` (máx. 3 intentos/hora por usuario) para mitigar spam de emails transaccionales en Upstash Redis.
3. **Callback:** Asegurar que `app/auth/callback/route.ts` procese el redirect hacia `/dashboard/configuracion?email_updated=1` y se muestre un toast de éxito.
4. **Supabase Auth Config:** Verificar la plantilla de correo "Change Email Address" y la política de *Secure email change* en el Dashboard de Supabase.
   *(Nota: en desarrollo `kynea-dev`, Resend solo envía a correos verificados de la cuenta propietaria).*

**Archivos:** `app/dashboard/configuracion/ConfiguracionClient.tsx`, `lib/auth/actions.ts`, `lib/ratelimit.ts`, `app/auth/callback/route.ts`, Supabase Dashboard.

---

## 10. DASHBOARD — MEJORAS

### 10.1 ⬜ Arreglar la métrica de vistas
Depende de 6.2. Una vez que `views_count` se incremente, la tasa de conversión
(`contacts_count / views_count`) en el dashboard muestra datos reales.

### 10.2 ⬜ Recomendaciones para el alumno (opcional)
En `app/dashboard/alumno`, mostrar "Clases recomendadas" según estilos favoritos del alumno
(depende de 2.1) con una query a `fetchPublishedClasses`.

### 10.3 ⬜ Vista calendario (opcional)
Vista semanal de los horarios del profesor (de `class_schedules` de sus clases publicadas).

---

## 11. DEUDA TÉCNICA

### 11.1 ✅ mockData eliminado
`lib/mockData.ts` borrado; 0 referencias en el código. Resuelto.

### 11.2 🔴 `classes.views_count` nunca se incrementa
Ver 6.2.

### 11.3 ⬜ `profiles.total_classes` nunca se actualiza
Se muestra en el perfil pero siempre es 0. No existe el trigger correspondiente en schema.

```sql
create or replace function update_teacher_total_classes() returns trigger as $$
begin
  update public.profiles
  set total_classes = (
    select count(*) from public.classes
    where teacher_id = new.teacher_id and status = 'published'
  )
  where id = new.teacher_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_class_status_change
  after insert or update of status on public.classes
  for each row execute function update_teacher_total_classes();
```

### 11.4 ⬜ `app/dashboard/configuracion/page.tsx` mock
Ver sección 9.

### 11.5 ⬜ Sort cosmético en `/clases`
Ver 5.1. El `<select>` de ordenamiento no aplica ningún `.sort()`.

---

## 12. INFRAESTRUCTURA

### Variables de entorno (Vercel)
| Variable | Cuándo |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya activa |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya activa |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Para 4.2 y 6.1 (Maps) |

### Tests (no existen)
- Server actions con **Vitest** (`createClass`, `updateProfile`).
- E2E del flujo registro + confirmación + crear clase con **Playwright**.

### Monitoring
Instalar **Sentry**. Los `catch` de los server actions solo hacen `console.error`.

### Deploy del schema
Migraciones versionadas en `supabase/migrations/`, aplicadas con `supabase db push` (Supabase CLI).

---

## Priorización sugerida

| # | Tarea | Esfuerzo | Impacto |
|---|-------|----------|---------|
| 🔴 1 | **1.3 Protección de rutas por rol** | Pequeño | Seguridad |
| 🔴 2 | **6.2 Incremento de vistas** | Pequeño | Métricas reales |
| 🔴 3 | **5.1 Sort funcional en catálogo** | Pequeño | UX básica |
| 🟡 4 | **1.1 Definir approach OTP/link y config Supabase** | Config | Desbloquea registro limpio |
| 🟡 5 | **1.4 Validaciones Zod** | Pequeño | Evita datos corruptos |
| 🟡 6 | **4.2 + 6.1 Google Maps autocomplete + mapa real** | Medio | UX de descubrimiento |
| 🟡 7 | **2.1 + 3.1 Onboarding y perfil del alumno** | Medio | Experiencia del alumno |
| 🟡 8 | **5.2 Paginación del catálogo** | Pequeño | Escalabilidad |
| ✅ 9 | **9.1 Cambio de contraseña / eliminar cuenta** | Pequeño | Resuelto |
| 🟢 10 | **5.3 SEO metadata dinámica** | Pequeño | Tráfico y previews |
| 🟡 11 | **8. Flujo de academias (registro, conversión, aprobación)** | Grande | Habilita el rol academia de verdad |
| 🟢 12 | **4.4 Importación CSV** | Grande | Eficiencia academia |
| 🟢 13 | **1.2 Google OAuth config** (activar en Supabase Dashboard) | Config | Conversión |
| 🟡 14 | **9.2 Cambio de correo conservando cuenta** | Medio | UX y retención de cuenta |

---

## Guía de inicio rápido para el desarrollador

1. **Clonar el repo** y crear `.env.local` con las variables de Supabase (pedir al dueño).
2. **Leer las migraciones en `supabase/migrations/`** — modelo de datos completo.
3. **Leer `lib/types.ts`** — tipos del proyecto.
4. **Leer las guías de Next.js 16** en `node_modules/next/dist/docs/` (hay breaking changes).
5. **Ejecutar** `npm install && npm run dev` — debe correr en `localhost:3000`.
6. **Arquitectura de `lib/`:** Feature Module Pattern — organizado por dominio (`classes/`,
   `profiles/`, `auth/`, `catalog/`, `stats/`). Cada módulo tiene `queries.ts` (lecturas) y/o
   `actions.ts` (mutaciones, `'use server'`).
7. **Primera tarea de código: 1.3 + 6.2** — protección de rutas por rol (seguridad) e incremento
   de vistas (métricas reales). Ambas son pequeñas y de alto impacto.

---

*Documento re-auditado el 2026-06-23 contra el código fuente. Commit base: rama `main` post-refactor
de lib/ (Pasos 1-3: Feature Module Pattern + filtrado server-side).*
