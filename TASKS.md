# Kynea — Funcionalidades y Tareas para Desarrollador

> Documento de handoff. Refleja el **estado real** de la plataforma tras un análisis
> profundo del código. Léelo completo antes de tocar nada.

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

## Estado actual

### ✅ Funciona
- Registro y Login con email + contraseña
- Recuperación de contraseña (email con link → `/auth/callback` → `/reset-password`)
- Onboarding de 5 pasos para profesor / academia
- Publicación de clases (formulario completo: media, horarios, precios, ubicación)
- Catálogo público: listado, filtros, detalle de clase, perfil del profesor
- Guardar clases como favorito (alumno)
- Dashboard del alumno: clases guardadas
- Dashboard del profesor/academia: mis clases, crear/editar/archivar/duplicar
- **Contacto al profesor**: botón con gate de registro → redirige a WhatsApp/Instagram
  (ya está correcto, ver sección 7)
- Middleware (`proxy.ts`) que exige login en `/dashboard` y `/onboarding`

### ❌ Roto o incompleto (prioridad de corrección)
- **Confirmación de email: ROTA.** La app muestra pantalla de código de 6 dígitos pero
  Supabase envía un email con link. Nadie recibe un código → registro bloqueado.
  Ver **1.1**. (Este es el bug más importante.)
- **Mapa: usa datos falsos.** `app/mapa/page.tsx` muestra clases hardcodeadas sobre un
  SVG estático, no clases reales ni un mapa real. Ver **6.1**.
- **Contador de vistas: siempre en 0.** `classes.views` nunca se incrementa al abrir una
  clase. Ver **6.4** y **11.2**.
- **Rating: se muestra vacío.** La UI pinta una estrella de rating que nunca tiene valor.
  Ver **11.4**.

### Archivos clave
| Archivo | Qué hace |
|---------|----------|
| `lib/supabase/server.ts` | Cliente Supabase para Server Components |
| `lib/supabase/client.ts` | Cliente Supabase para Client Components |
| `lib/queries/classes.ts` | Lecturas de datos (fetch functions + mappers) |
| `lib/actions/classes.ts` | Mutaciones (server actions: clases y perfil) |
| `lib/types.ts` | Tipos TypeScript del proyecto |
| `supabase/schema.sql` | Schema completo de la DB (tablas, RLS, triggers, storage) |
| `proxy.ts` | Middleware de autenticación |

---

## 1. AUTH Y SEGURIDAD

### 1.1 🔴 Arreglar la confirmación de email (OTP) — TAREA #1
**El problema (confirmado en código):** Hay dos mecanismos de confirmación montados en
paralelo que se contradicen:
- `app/registro/page.tsx` hace `signUp()` con `emailRedirectTo` y luego manda al usuario
  a `app/confirmar-email/page.tsx`, que pide un **código de 6 dígitos** y llama
  `verifyOtp({ type: 'signup', token })`.
- Pero `verifyOtp` con código solo funciona si la plantilla de email de Supabase envía
  `{{ .Token }}`. **Esa plantilla nunca se configuró.** Supabase manda su email por
  defecto con un **link** (`{{ .ConfirmationURL }}`), que cae en `app/auth/callback/route.ts`.
- Resultado: al usuario le llega un **link**, pero la app le muestra una pantalla
  pidiéndole un **código** que nunca recibió. Registro bloqueado.

**Decisión tomada: mantener el código OTP de 6 dígitos.** Tareas:
1. **Configurar la plantilla en Supabase** → Authentication → Email Templates →
   "Confirm signup": el cuerpo debe mostrar `{{ .Token }}` (el código de 6 dígitos) y
   **NO** incluir `{{ .ConfirmationURL }}` (el link, además, hace que Gmail pre-escanee y
   "queme" el token). Lo mismo para la plantilla de "Reset password" si se quiere OTP ahí.
2. **Quitar el camino de magic-link del signup** para que no compita con el OTP: en
   `app/registro/page.tsx`, eliminar `emailRedirectTo` del `signUp()` (el callback queda
   solo para Google OAuth y reset de contraseña).
3. **Probar de punta a punta**: registrar → llega email con código → ingresarlo en
   `/confirmar-email` → sesión activa → redirige según rol.
4. **Documentar** la configuración de la plantilla en `DEPLOY.md` (hoy está como
   "Opción A" pero nunca se aplicó).

**Archivos:** `app/registro/page.tsx`, `app/confirmar-email/page.tsx`,
`app/auth/callback/route.ts` (revisar), Supabase Dashboard (config), `DEPLOY.md`.

### 1.2 Google OAuth — código listo, falta configuración
El botón ya existe en `app/registro/page.tsx` y `app/login/page.tsx` (`signInWithOAuth`),
y `/auth/callback/route.ts` ya maneja el código. **Falta:** activar el provider en
Supabase (Authentication → Providers → Google) con Client ID/Secret de Google Cloud
Console, y autorizar el callback `https://<proyecto>.supabase.co/auth/v1/callback` en
Google Console.

### 1.3 Protección de rutas por rol
**Problema:** `proxy.ts` verifica "¿está logueado?" pero no el rol. Un alumno puede
entrar a mano a `/dashboard/crear-clase`; el server component devuelve `null` en silencio
en vez de redirigir.
**Tarea:** en cada server component exclusivo de profesor/academia, detectar el rol y
redirigir al alumno a `/dashboard/alumno`.
**Archivos:** `app/dashboard/mis-clases/page.tsx`, `app/dashboard/crear-clase/page.tsx`,
`app/dashboard/contactos/page.tsx`, `app/dashboard/importar-csv/page.tsx`,
`app/dashboard/profesores/page.tsx`.

### 1.4 Validación del lado servidor (Zod)
`createClass` y `updateProfile` en `lib/actions/classes.ts` insertan en la DB confiando
solo en el form del cliente. **Tarea:** validar con Zod en cada server action: `price`
positivo, `title` 5–100 caracteres, `email` con formato válido, `end_date` posterior a
`start_date`, etc.

### 1.5 Política de contraseñas
Añadir indicador de fortaleza en `app/registro/page.tsx` y subir el mínimo a 8 caracteres
en Supabase → Auth → Settings.

---

## 2. ONBOARDING — LOS 3 ROLES

### 2.1 Onboarding del Alumno (no existe)
Hoy el alumno se registra y va directo a `/clases`; su perfil queda vacío (solo `name` y
`role`). **Tarea:** crear `app/onboarding-alumno/page.tsx` (2–3 pasos ligeros): estilos
de interés (multi-select de `DanceStyle`), distrito de Lima, nivel. Cambiar el destino
post-registro del alumno de `/clases` a `/onboarding-alumno`. Sirve para personalizar
recomendaciones más adelante (10.2).

### 2.2 Onboarding del Profesor — mejoras
**Archivo:** `app/onboarding/page.tsx`. Problemas: se puede avanzar con campos vacíos; la
subida de foto no está implementada en el wizard (solo desde `/dashboard/perfil`).
**Tarea:** validar campos antes de avanzar de paso; implementar el upload de foto a
Supabase Storage en el paso de datos (reutilizar el patrón de upload del formulario de
clases).

### 2.3 Onboarding de la Academia — diferenciación
Hoy usa el mismo wizard que el profesor, sin diferencias. **Tarea:** cuando
`role === 'academia'`, añadir "Nombre comercial / del estudio" en el paso de datos, un
campo opcional "¿Cuántos profesores trabajan contigo?", y al terminar mostrar un CTA a
`/dashboard/profesores` para armar el equipo.

---

## 3. PERFIL — LOS 3 ROLES

### 3.1 Perfil del Alumno — pantalla incorrecta
El alumno ve `/dashboard/perfil` con campos de profesor (estilos que enseña, años de
experiencia docente, redes sociales) — irrelevante. **Tarea:** crear
`app/dashboard/perfil/PerfilAlumnoClient.tsx` con campos propios (nombre, foto,
ciudad/distrito, estilos favoritos como preferencia, nivel, bio corta). En
`app/dashboard/perfil/page.tsx`, detectar rol y renderizar el cliente correcto.

### 3.2 Perfil del Profesor — mejoras
Funciona bien. Pendientes: cambiar el input de URL de foto por un file upload real a
Supabase Storage; `profiles.total_classes` nunca se actualiza (ver 11.3).

### 3.3 Perfil de la Academia — campos propios
Hoy idéntico al del profesor. Campos que debería tener: nombre comercial del estudio,
horario de atención, dirección principal del estudio, galería de fotos del espacio.
**Tarea:** añadir columnas en `profiles` y exponerlas en `updateProfile()`.

---

## 4. CREACIÓN Y GESTIÓN DE CLASES

### 4.1 Validaciones del formulario
**Archivo:** `app/dashboard/crear-clase/CrearClaseForm.tsx`. Hoy se puede publicar una
clase sin precio, sin descripción o sin horario, y no valida fechas. **Tarea:** validación
Zod en `createClass` (`lib/actions/classes.ts`) + mensajes de error inline en el form.

### 4.2 Google Maps en la dirección de la clase
Hay un `// TODO: Google Places Autocomplete` en `CrearClaseForm.tsx` (~línea 623). Las
columnas `lat`/`lng` existen en `classes` pero nunca se llenan. **Tarea:** agregar
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, integrar Places Autocomplete en el campo de dirección y
guardar `lat`/`lng`. (Esto alimenta el mapa de la sección 6.1.)

### 4.3 Estado "finalizada" para clases vencidas
Clases con `end_date` pasada siguen apareciendo como publicadas. **Tarea:** filtrar en
`fetchPublishedClasses` (`lib/queries/classes.ts`) por fecha futura/nula, o un trigger que
cambie el status a `finished`.

### 4.4 Importación CSV — implementar el parseo
**Archivo:** `app/dashboard/importar-csv/page.tsx`. La UI existe pero no procesa el
archivo. **Tarea:** parsear con PapaParse, mapear columnas a `DanceClass`, preview real,
inserción en lote vía `createClass`. Definir y documentar primero las columnas requeridas.

---

## 5. DESCUBRIMIENTO Y BÚSQUEDA

### 5.1 Más filtros en la búsqueda
**Archivos:** `lib/queries/classes.ts` y `app/buscar/page.tsx`. Faltan: rango de precio
(min/max), solo clases con prueba gratis (`is_trial_free = true`), y ordenar por (más
recientes / más baratas / más populares por contactos o guardados).

### 5.2 Paginación del catálogo
`fetchPublishedClasses` devuelve todas las clases sin límite. Con 100+ se vuelve lento.
**Tarea:** `limit`/`offset` con `.range()` de Supabase + "Cargar más" en `app/clases/page.tsx`.

### 5.3 SEO — metadata dinámica
Añadir `generateMetadata` en `app/clases/[id]/page.tsx` y `app/profesores/[id]/page.tsx`
(título, descripción, imagen) para indexación y previews al compartir.

### 5.4 🟡 Directorio de profesores y academias (home + páginas de listado)
**Contexto — los 3 perfiles:** la plataforma tiene 3 tipos de usuario: alumno (toma
clases), profesor (independiente) y academia (estudio). El home debe ayudar a descubrir
profesores y academias, no solo clases.

**Lo que YA existe (verificado en código):**
- `app/page.tsx` ya consulta `fetchFeaturedProfiles('profesor')` y
  `fetchFeaturedProfiles('academia')` y se los pasa al home.
- `app/HomeClient.tsx` ya renderiza **dos secciones**: "Profesores destacados"
  (grid, ~línea 512) y "Academias" (lista, ~línea 567), ambas debajo de las categorías
  y de "Clases esta semana", en ese orden.

**Problemas a resolver:**
1. **Las secciones se ocultan si no hay datos.** Están envueltas en
   `{initialTeachers.length > 0 && …}` y `{initialAcademias.length > 0 && …}`. Hoy no se
   ven porque **no hay perfiles de profesor/academia en la BD**. Solución elegida:
   **sembrar datos reales en Supabase** (ver 5.5). Ojo: `mapTeacher` hace
   `photo: t.photo_url ?? ''`; un perfil sin foto deja `<img src="">` roto, así que la
   semilla debe incluir `photo_url`, `dance_styles`, `city` y `district`.
2. **Los enlaces "Ver todos / Ver todas" están rotos** → hoy apuntan a `/profesores` y
   `/profesores?type=academia`, pero **solo existe `app/profesores/[id]/page.tsx`** (el
   detalle). No hay página de listado. Ambos dan 404.
3. **`fetchFeaturedProfiles` no filtra "destacados" reales**: trae los primeros N por
   rol, sin importar si el perfil está completo. **Tarea:** filtrar a perfiles con foto y
   estilos (o añadir una columna `featured boolean` en `profiles` y ordenar por ella /
   por `total_classes`).

**Páginas de listado a crear:**
- **`app/profesores/page.tsx`** — listado de todos los profesores (`role = 'profesor'`),
  con buscador/filtro por estilo y ciudad. Reutilizar el patrón server→client de
  `app/clases/page.tsx`. El enlace "Ver todos" del home apunta aquí.
- **`app/academias/page.tsx`** — **página propia** (ruta dedicada) con el listado de
  academias (`role = 'academia'`). Cambiar el enlace "Ver todas" del home de
  `/profesores?type=academia` a **`/academias`**.
- Ambas reutilizan `ClassCard`/tarjetas existentes y enlazan a `/profesores/[id]`
  (el detalle ya funciona para profesor y academia).
- Añadir una nueva query `fetchProfilesByRole(role, filters?)` en `lib/queries/classes.ts`
  (similar a `fetchFeaturedProfiles` pero sin `limit` y con filtros), o generalizar la
  existente.

### 5.5 Datos semilla de profesores y academias (Supabase)
Para que el home y los listados se vean poblados, **insertar perfiles reales en la BD**
(no hardcodear en el componente). Crear `supabase/seed.sql` con varios perfiles
`profesor` y `academia` completos (con `photo_url`, `dance_styles`, `city`, `district`,
`whatsapp`, `instagram`). Se pueden basar en los 4 ejemplos que ya están en
`lib/mockData.ts` (Academia Ritmo Latino, Studio Urbano, Sofía Vega, María Elena Quispe).
> Nota: los perfiles cuelgan de `auth.users` (FK). Para semilla, crear primero los
> usuarios de auth (o usar el panel de Supabase) y luego sus filas en `profiles`.
Una vez sembrado, las secciones del home aparecen solas (las queries ya existen) y se
puede quitar cualquier dependencia de `mockData` en producción (ver 11.6).

---

## 6. MAPA Y VISTAS

### 6.1 🟡 Mapa de clases con Google Maps — datos reales
**Archivo:** `app/mapa/page.tsx`. Hoy usa `mockClasses` y un SVG estático de Lima.
**Tarea:** convertir a datos reales (`fetchPublishedClasses()`) y reemplazar el SVG por un
**Google Map** real con marcadores en `lat`/`lng` de cada clase. Requiere
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (la misma de 4.2). Clic en un marcador → tarjeta de la
clase con link al detalle. Clases sin coordenadas no aparecen en el mapa (de ahí la
importancia de 4.2).

### 6.2 🟡 Incremento de vistas al abrir una clase
**Problema:** `classes.views` siempre es 0; el dashboard de métricas y la tasa de
conversión quedan inservibles. **Tarea:** crear la función SQL y llamarla desde el server
component del detalle al cargar la página.

```sql
create or replace function increment_class_views(class_id uuid)
returns void language sql security definer as $$
  update public.classes set views = views + 1
  where id = class_id and status = 'published';
$$;
```

En `app/clases/[id]/page.tsx` (server component), tras obtener la clase, llamar
`supabase.rpc('increment_class_views', { class_id: id })`. (Hacerlo en el servidor, no en
el cliente, para no depender del navegador. Mejora futura opcional: deduplicar por sesión
para no inflar con recargas.)

---

## 7. CONTACTO CON EL PROFESOR — ya correcto, no tocar

Confirmado en código (`app/clases/[id]/ClaseDetailClient.tsx`, `components/ContactModal.tsx`,
`components/ClassCard.tsx`): **no hay formulario** que pida nombre/email/mensaje. El flujo
es: usuario logueado hace clic en el botón → se abre WhatsApp/Instagram con el link que el
profesor configuró. Si no está logueado, el `ContactModal` actúa solo como **gate de
registro** (decisión de producto: mantener el gate para captar usuarios). Al hacer clic se
incrementa `classes.contacts` vía la RPC `increment_class_contacts` (ya implementada).

**No hay tareas pendientes aquí.** No construir inscripciones, ni conteo de "alumnos
inscritos", ni cupos automáticos, ni formularios de contacto: la coordinación y el pago
ocurren fuera de la plataforma.

> Detalle menor opcional: el botón "Contactar" de `components/ClassCard.tsx` **no**
> incrementa `contacts` (solo lo hace el detalle). Si se quiere paridad de métricas,
> añadir la RPC también ahí.

---

## 8. GESTIÓN DE PROFESORES (Academia)

### 8.1 Roster de profesores — implementar en DB
**Archivo:** `app/dashboard/profesores/page.tsx`. Hoy la lista de profesores es mock
(hardcodeada, no persiste). Es la herramienta de la academia para administrar a su
**equipo** (no es inscripción de alumnos). **Propuesta:** tabla `academy_teachers` +
flujo de invitación por email (la academia ingresa el email → invitación → el profesor
acepta → aparece en el roster). Las clases de la academia pueden asignarse a un profesor
del roster.

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

**Archivo:** `app/dashboard/configuracion/page.tsx` — hoy todos los toggles son mock (no
persisten). Tareas mínimas:
- **Cambio de contraseña:** campos "nueva contraseña" + "confirmar" →
  `supabase.auth.updateUser({ password })`.
- **Eliminar cuenta:** botón con modal de confirmación → server action que llame
  `supabase.auth.admin.deleteUser(userId)`. El CASCADE de la DB ya borra el profile y las
  clases.
- El resto de toggles que no se implementen: dejarlos con badge "Próximamente" o quitarlos.

---

## 10. DASHBOARD — MEJORAS

### 10.1 Arreglar la métrica de vistas
Depende de 6.2. Una vez que `views` se incremente, la tasa de conversión
(`contacts / views`) y el resumen de `app/dashboard/contactos/page.tsx` muestran datos
reales.

### 10.2 Recomendaciones para el alumno (opcional)
En `app/dashboard/alumno`, además de las clases guardadas, mostrar "Clases recomendadas"
según sus estilos favoritos (de 2.1) con una query simple a `fetchPublishedClasses`.

### 10.3 Vista calendario (opcional)
Vista semanal de los horarios del profesor (de `time_slots` de sus clases publicadas) para
detectar conflictos.

---

## 11. DEUDA TÉCNICA

### 11.1 Mapa con datos mock
Ver 6.1.

### 11.2 `classes.views` nunca se incrementa
Ver 6.2.

### 11.3 `profiles.total_classes` nunca se actualiza
Se muestra en el perfil ("X clases") pero queda en 0. Trigger sugerido:
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

### 11.4 `app/dashboard/configuracion/page.tsx` mock
Ver sección 9.

### 11.6 `lib/mockData.ts` en producción
Solo debería usarse en tests/desarrollo. Hoy lo importa `app/mapa/page.tsx` (se resuelve
en 6.1). Verificar que ninguna otra ruta de producción lo use y marcarlo como
solo-desarrollo.

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
- E2E del flujo registro + confirmación OTP + crear clase con **Playwright**.

### Monitoring
Instalar **Sentry**. Hoy los `catch` de los server actions solo hacen `console.error`.

---

## Priorización sugerida

| # | Tarea | Esfuerzo | Impacto |
|---|-------|----------|---------|
| 🔴 1 | **1.1 Arreglar confirmación de email (OTP)** | Pequeño | Bloquea el registro |
| 🔴 2 | **5.5 Sembrar BD con profesores y academias** | Pequeño | Home vacío sin esto |
| 🔴 3 | **5.4 Páginas listado /profesores y /academias** | Medio | Links del home dan 404 |
| 🔴 4 | **1.4 Validaciones del formulario de clase (Zod)** | Pequeño | Evita datos corruptos |
| 🔴 5 | **1.3 Protección de rutas por rol** | Pequeño | Seguridad |
| 🟡 6 | **6.1 Mapa con Google Maps + datos reales** | Medio | UX de descubrimiento |
| 🟡 7 | **6.2 Incremento de vistas** | Pequeño | Métricas reales |
| 🟡 8 | **4.2 Google Maps autocomplete (lat/lng)** | Medio | Habilita el mapa |
| 🟡 9 | **2.1 / 3.1 Onboarding y perfil del alumno** | Medio | Experiencia del alumno |
| 🟡 10 | **5.2 Paginación del catálogo** | Pequeño | Escalabilidad |
| 🟢 11 | **1.2 Google OAuth (config)** | Pequeño | Conversión de registro |
| 🟢 12 | **8.1 Roster de profesores de academia** | Grande | Feature de academia |
| 🟢 13 | **9 Cambio de contraseña / eliminar cuenta** | Pequeño | Completitud |
| 🟢 14 | **5.1 / 5.3 Filtros y SEO** | Pequeño | Tráfico y UX |
| 🟢 15 | **4.4 Importación CSV** | Grande | Eficiencia academia |

---

## Guía de inicio rápido para el desarrollador

1. **Clonar el repo** y crear `.env.local` con las variables de Supabase (pedir al dueño).
2. **Leer `supabase/schema.sql`** — modelo de datos completo.
3. **Leer `lib/types.ts`** — tipos del proyecto.
4. **Leer las guías de Next.js 16** en `node_modules/next/dist/docs/` (hay breaking changes).
5. **Ejecutar** `npm install && npm run dev` — debe correr en `localhost:3000`.
6. **Primera tarea: 1.1 — arreglar la confirmación de email (OTP).** Hoy el registro está
   bloqueado para usuarios reales; sin esto, nadie puede crear cuenta y probar el resto.
