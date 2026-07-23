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
| `lib/catalog/queries.ts` | `fetchDanceStyles`, `fetchClassLevels`, `fetchDistricts` |
| `lib/catalog/lookups.ts` | `lookupLevelId`, `lookupStyleId`, `lookupDistrictId` |
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

El wizard es idéntico al del profesor. No hay campos extra para academia.

**Tarea:** cuando `role === 'academia'`, añadir campos de academia (nombre del estudio,
número de profesores, etc.) y al terminar mostrar CTA a `/dashboard/profesores`.

> Ver también CLAUDE.md → "TODO: Campos exclusivos para academia en onboarding".

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

La tabla `profiles` no tiene columnas específicas de academia (nombre comercial, horario,
dirección principal, galería). `updateProfile` en `lib/profiles/actions.ts` no diferencia roles.

**Tarea:** añadir columnas en `profiles` (requiere migración SQL) y exponerlas en `updateProfile`.

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

### 4.3 🟡 Estado "finalizada" para clases vencidas

El status `'finished'` existe en el schema (`supabase/migrations/20260705000050_05_classes.sql`, CHECK incluye `'finished'`), pero
**no se usa automáticamente**: `fetchPublishedClasses` filtra por `.eq('status','published')` sin
verificar `end_date`, y no hay trigger que marque clases vencidas.

**Tarea (opción A):** añadir `.or('end_date.is.null,end_date.gte.today')` en
`lib/classes/queries.ts`. **Opción B:** trigger SQL que cambie el status a `finished` cuando
`end_date < now()`.

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

### 5.3 ⬜ SEO — metadata dinámica

Ni `app/clases/[id]/page.tsx` ni `app/profesores/[id]/page.tsx` tienen `generateMetadata`.
**Tarea:** exportar `generateMetadata` en ambas rutas (título, descripción, imagen OG).

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

## 8. GESTIÓN DE PROFESORES (Academia)

### 8.1 ⬜ Roster de profesores — implementar en DB

`app/dashboard/profesores/page.tsx` existe pero usa datos mock (`MOCK_ACADEMY_TEACHERS` en
estado local). Los cambios no persisten. No existe tabla `academy_teachers` en el schema.

**Propuesta:** tabla `academy_teachers` + flujo de invitación por email:

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
alter table public.academy_teachers enable row level security;
create policy "academy_teachers_own" on public.academy_teachers
  using (academy_id = auth.uid()) with check (academy_id = auth.uid());
```

---

## 9. CONFIGURACIÓN DE CUENTA

### 9.1 ⬜ Implementar cambio de contraseña y eliminar cuenta

`app/dashboard/configuracion/page.tsx` es **100% estático**. No hay `onChange` en toggles, no
hay campos de contraseña, los botones "Eliminar mi cuenta" y "Eliminar todas mis clases" no
tienen `onClick`.

**Tareas mínimas:**
- **Cambio de contraseña:** campos "nueva contraseña" + "confirmar" →
  `supabase.auth.updateUser({ password })`.
- **Eliminar cuenta:** botón con modal de confirmación → server action que llame
  `supabase.auth.admin.deleteUser(userId)`. El CASCADE de la DB ya borra el profile y las clases.
- Toggles sin implementar: dejarlos con badge "Próximamente" o quitarlos.

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
| 🟢 9 | **9 Cambio de contraseña / eliminar cuenta** | Pequeño | Completitud |
| 🟢 10 | **5.3 SEO metadata dinámica** | Pequeño | Tráfico y previews |
| 🟢 11 | **8.1 Roster de profesores de academia** | Grande | Feature de academia |
| 🟢 12 | **4.4 Importación CSV** | Grande | Eficiencia academia |
| 🟢 13 | **1.2 Google OAuth config** (activar en Supabase Dashboard) | Config | Conversión |

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
