# Informe: marcaciones (eventos) de Kynea para GTM

Este documento resume todo lo que hemos conversado e implementado sobre medición/analítica en la plataforma Kynea, para usarlo como referencia al configurar Google Tag Manager (GTM).

## 1. Contexto general de la implementación

- **Contenedor GTM:** `GTM-KVGV4DR9`.
- **Cuándo se activa:** solo cuando `NEXT_PUBLIC_APP_ENV=production` (el entorno de Producción real en Vercel). En local/dev y en preview deploys, GTM ni siquiera se carga — nada de lo que sigue va a verse funcionando fuera de producción.
- **Mecanismo:** todo el código de tracking vive en un solo archivo, `lib/analytics.ts`. Cada función ahí (`trackSignUp`, `trackGenerateLead`, `trackAuthCtaClick`, `trackAuthAttempt`) hace un `window.dataLayer.push({ event: '...', ...parámetros })`.
- **Importante:** empujar al `dataLayer` por sí solo **no manda nada a GA4**. Cada evento necesita, del lado de GTM:
  1. Una o más **Variables de capa de datos** (una por cada parámetro del evento).
  2. Un **Trigger** de tipo "Evento personalizado" con el nombre exacto del evento.
  3. Un **Tag** de tipo "Evento de GA4" que mapea esas variables a parámetros del evento en GA4, disparado por ese Trigger.
  4. Probarlo en modo **Preview** antes de publicar.
  5. **Publicar** el contenedor — sin este paso, todo queda solo en el workspace de GTM.

## 2. Eventos ya implementados en el código (dataLayer)

Estos cuatro eventos **ya están disparándose** en producción ahora mismo — lo único que falta es la configuración del lado de GTM (Data Layer Variables + Trigger + Tag) para que efectivamente lleguen a GA4.

### 2.1 `sign_up` — registro completado

- **Qué mide:** la conversión final del embudo de registro — se dispara **una sola vez**, cuando el usuario efectivamente termina de crear su cuenta (cualquier rol, cualquier método).
- **Dónde en el código:** `app/onboarding/page.tsx`, gated por el query param `?new=1` (que solo ponen los 4 puntos reales de fin de registro — así nunca se dispara dos veces para la misma cuenta, ni cuando `proxy.ts` rebota a alguien de vuelta a onboarding por tenerlo incompleto).
- **Por qué es un solo punto:** converge los 4 flujos posibles de registro (correo con sesión inmediata, correo con confirmación por código OTP, Google con rol preseleccionado desde `/registro`, Google vía `/completar-registro` cuando no había rol preseleccionado).
- **Parámetros:**
  | Parámetro | Valores | Descripción |
  |---|---|---|
  | `role` | `alumno` / `profesor` / `academia` | Rol elegido |
  | `method` | `email` / `google` | Método de registro |

### 2.2 `generate_lead` — contacto con un profesor

- **Qué mide:** la conversión principal del marketplace — cuando un alumno logueado efectivamente abre WhatsApp o Instagram para contactar a un profesor.
- **Dónde en el código:** `components/ClassCard.tsx`, `components/ContactModal.tsx`, `app/clases/[id]/ClaseDetailClient.tsx`, `app/profesores/[slug]/ProfesorDetailClient.tsx`, `app/mapa/MapaClient.tsx` — los 5 puntos reales donde existe un botón de contacto.
- **Importante:** **no** se dispara cuando un usuario sin sesión ve el gate de registro al intentar contactar — solo cuenta el contacto real, para no inflar la métrica con gente que ni siquiera tiene cuenta.
- **Parámetros:**
  | Parámetro | Valores | Descripción |
  |---|---|---|
  | `lead_channel` | `whatsapp` / `instagram` | Canal usado |
  | `class_id` | texto | ID de la clase |
  | `class_name` | texto | Título de la clase |
  | `class_style` | texto | Estilo de baile |
  | `teacher_id` | texto | ID del profesor |
  | `teacher_name` | texto | Nombre del profesor |

### 2.3 `auth_cta_click` — clic de intención hacia registro/login

- **Qué mide:** el **primer paso** del embudo — cualquier clic en un link/botón que lleva a `/registro` o `/login`, sin importar si la persona termina completando algo.
- **Dónde en el código:** ~15 puntos distintos del sitio. El parámetro `cta_location` identifica cuál:

  | `cta_location` | Dónde está |
  |---|---|
  | `header_desktop_profesor` | Botón "Únete como profesor" del Header, versión desktop (lleva a `/unete`) |
  | `header_mobile_profesor` | Mismo botón, menú mobile del Header |
  | `home_teacher_cta` | "Publicar mi primera clase →" (sección "¿Eres profesor o academia?" del Home, lleva a `/unete`) |
  | `home_bottom_ribbon` | "Registrarme gratis" del banner morado fijo al fondo del Home (solo visible sin sesión) |
  | `contact_modal_desktop` | Botones del modal "Contacta a tu profesor", versión desktop |
  | `contact_modal_mobile` | Mismos botones, versión mobile (bottom sheet) |
  | `registro_page` | Link "Inicia sesión" dentro de la propia página de registro (alumno) |
  | `unete_page` | Link "Inicia sesión" dentro de `/unete` (registro de profesor) |
  | `login_page` | Link "Regístrate gratis" dentro de la propia página de login |
  | `confirmar_email_page` | Links "Volver al registro" en la pantalla de confirmación de correo |
  | `reset_password_page` | Link "Ir al login" cuando un enlace de recuperación es inválido/expiró |
  | `auth_error_banner` | Banner de error de autenticación que aparece tras un enlace roto |
  | `save_class_gate` | Botón "Guardar clase" en el detalle de una clase, cuando quien hace clic no tiene sesión |

  **Nota (cambio de estructura):** el Header ya no ofrece un botón directo de "Registrarme" genérico — se separó en dos caminos: "Iniciar sesión" (universal, incluye el cross-link a registro de alumno) y "Únete como profesor" (`/unete`, landing dedicada solo para profesores). El registro de alumno vive en `/registro` (sin selector de rol, directo al formulario) y ya no comparte pantalla con el de profesor.

- **Parámetros:**
  | Parámetro | Valores |
  |---|---|
  | `auth_action` | `registro` / `login` |
  | `cta_location` | uno de los valores de la tabla de arriba |

### 2.4 `auth_attempt` — intento real de registro/login

- **Qué mide:** el **paso intermedio** del embudo — cuando la persona ya está en `/registro` o `/login` y efectivamente envía el formulario o hace clic en "Continuar con Google" (sea que Supabase lo acepte o no).
- **Dónde en el código:**
  - `app/registro/page.tsx` — envío del formulario por correo, y clic en "Continuar con Google".
  - `app/login/page.tsx` — mismo par (correo y Google).
  - `app/confirmar-email/page.tsx` — envío del código de 6 dígitos (paso final del registro por correo).
  - `app/completar-registro/CompletarRegistroClient.tsx` — confirmación de rol tras un login con Google que todavía no tenía rol asignado.
- **Parámetros:**
  | Parámetro | Valores |
  |---|---|
  | `auth_action` | `registro` / `login` |
  | `auth_method` | `email` / `google` / `email_otp` |

## 3. El embudo que esto permite armar en GA4

```
auth_cta_click  →  auth_attempt  →  sign_up
(clic de intención)  (envío real)   (cuenta creada)
```

Y por separado, la conversión de negocio de todo el marketplace:

```
generate_lead
(alumno contacta a un profesor por WhatsApp/Instagram)
```

Con `auth_cta_click` y `auth_attempt` puedes ver en qué punto exacto la gente abandona (¿hace clic pero nunca llega a intentar? ¿intenta pero falla?), y con `cta_location` puedes comparar qué botón/ubicación convierte mejor.

## 4. Cómo conectar cada evento en GTM (mismo procedimiento para los 4)

Por cada evento (`sign_up`, `generate_lead`, `auth_cta_click`, `auth_attempt`):

1. **Variables → Nueva → Variable de capa de datos** (tipo "Versión 2"), una por cada parámetro de la tabla correspondiente arriba. Ejemplo para `auth_cta_click`: `DLV - auth_action`, `DLV - cta_location`.
2. **Triggers → Nuevo → Evento personalizado**, nombre del evento exacto (ej. `auth_cta_click`).
3. **Tags → Nuevo → Evento de Google Analytics: GA4**:
   - Configuration Tag: tu tag de configuración GA4 existente.
   - Nombre del evento: el mismo nombre (ej. `auth_cta_click`).
   - Parámetros del evento: mapear cada `DLV - ...` a su parámetro (ej. `auth_action` → `{{DLV - auth_action}}`).
   - Trigger: el que creaste en el paso 2.
4. **Modo Preview**, conectado a producción (o donde `NEXT_PUBLIC_APP_ENV=production`), y probar cada acción real en el sitio para confirmar que el tag dispara con los parámetros correctos.
5. **Enviar → Publicar**, con una descripción clara del cambio. Sin este paso, nada de esto llega a GA4 real.

(Opcional) En GA4 → Admin → Eventos, puedes marcar `sign_up` y `generate_lead` como conversiones — son las dos métricas de negocio reales. `auth_cta_click` y `auth_attempt` son más útiles como pasos de embudo/diagnóstico que como conversiones en sí.

## 5. Qué se discutió pero no se implementó todavía

Al principio de esta conversación sobre medición, se propuso una lista más amplia de eventos candidatos (más allá de los 4 de arriba), y la decisión explícita fue **empezar solo por `generate_lead` y `sign_up`** — esos dos ya están implementados. Los demás candidatos de esa lista original no quedaron documentados en detalle en esta conversación.

Si quieres retomar ese ejercicio más adelante, algunos candidatos típicos para una plataforma de este tipo (a definir/priorizar cuando quieran, todavía no implementados):
- `view_item` — alguien abre el detalle de una clase.
- `search` — alguien usa la barra de búsqueda.
- `save_class` — alguien guarda/marca una clase como favorita.
- `select_item` — clic en una clase desde un listado/carrusel.
- Eventos específicos del lado profesor (publicar clase, editar clase, etc.).

## 6. Cosas a tener en cuenta antes de activar todo esto en GTM

- **Nada de esto se ve fuera de producción.** Probar en local/dev no va a mostrar actividad en GTM Preview salvo que se fuerce `NEXT_PUBLIC_APP_ENV=production` en ese entorno.
- **Revisar `COMING_SOON_MODE` en Vercel.** Si esa variable está en `true` en producción, `proxy.ts` reescribe *todo* el sitio a una página "Próximamente" — ninguno de estos eventos podría dispararse porque nadie llega a las páginas reales.
- Los eventos ya están en código y son inofensivos mientras GTM no tenga un Trigger para ellos — se pueden dejar "dormidos" todo el tiempo que se quiera antes de conectarlos.
