# Informe: marcaciones (eventos) de Kynea para GTM

Este documento resume todo lo conversado e implementado sobre medición/analítica en la plataforma Kynea, para usarlo como referencia al configurar Google Tag Manager (GTM).

> **v2 (2026-08-05):** el embudo de auth cambió desde la primera versión de este documento — antes login/registro de alumno y profesor vivían en una sola pantalla; ahora están separados (`/registro` solo alumno, `/unete/beneficios` → `/unete` solo profesor). Se aprovechó la actualización para mapear también onboarding, creación de clases y visualización de clases, que antes no estaban cubiertos. Las secciones 2.1–2.4 (eventos ya implementados) siguen vigentes tal cual — solo se actualizó la tabla de `cta_location`. Las secciones 3.5–3.7 son **propuestas nuevas, todavía sin código** — ver sección 4 para qué falta implementar antes de poder configurarlas en GTM.
>
> **v3 (2026-08-06):** deep-dive específico sobre auth (login + registro) pedido para resolver una duda concreta: *¿cómo se determina el rol (alumno/profesor/academia) en el login, si el formulario de login no lo pide?* Ver sección 9 — cubre el mecanismo real de resolución de rol, un gap de código encontrado en `redirectByRole.ts`, el problema arquitectónico del callback de Google (server-side, sin acceso a `dataLayer`), el doble-conteo de `auth_cta_click` en el camino profesor vía `/unete/beneficios`, el detalle de qué se mide hoy del OTP, y la spec completa de un evento nuevo (`login_success`) más un candidato adicional (`otp_verify_failed`). Escrito para pasarse a otra conversación de Claude y volver después solo a ejecutar.
>
> **v4 (2026-08-28):** re-análisis completo pedido tras el rediseño del Home (hero desktop/mobile con buscador estilo VRBO, header con prop `homeNav`, drawer mobile universal role-aware) y la aparición de `/academias` como tercer flujo de registro directo (antes solo alumno/profesor). Verificado línea por línea contra el código real de `lib/analytics.ts` y todos sus call sites:
> - **4 regresiones/huecos reales encontrados y arreglados:** (1) el drawer mobile rediseñado (`components/Header.tsx`) dejó de trackear sus dos links de upsell (`¿Tienes una academia?` / `Sé profesor en Kynea`) — el `header_mobile_profesor` que documentaba v1-v3 llevaba tiempo sin disparar nada; (2) el link "Regístrate aquí" de `/academias` hacia `/unete` nunca tuvo tracking; (3) el toggle Lista/Mapa de `/clases` y `/categorias/[slug]` (estado local de React, sin cambio de URL) no disparaba nada — ni un pageview automático lo veía; (4) los links "Ver clase" del popup y la lista lateral del mapa (`ClasesMapView.tsx`) no disparaban `select_item` — el `listName='mapa'` fijo que documentaba v1-v3 nunca se migró cuando `/mapa` (CSS falso) fue reemplazado por el mapa real embebido en `/clases`. Ver 3.3/9.2 (1-2) y 3.8/3.11 (3-4).
> - **Tabla de `cta_location` reescrita** — 7 ubicaciones nuevas del hero rediseñado del Home (`header_home_desktop_*`, `header_home_mobile_registro`) y de `/academias` que no existían en v1-v3.
> - **Cambio de comportamiento (no de tracking) en `home_teacher_cta`:** ahora se oculta para profesor/academia ya logueados — el evento sigue igual, pero quien puede dispararlo cambió; relevante al interpretar tendencias históricas.
> - **3 eventos nuevos implementados**, dos de la lista de candidatos pendientes (sección 7) y uno encontrado en esta misma ronda: `search` (3.9) y `save_class` (3.10) maduraron de "quizás algún día" a "vale la pena" con el buscador VRBO-style nuevo; `map_view_toggle` (3.11) mide el toggle Lista/Mapa, pedido explícitamente al revisar el estado de la medición del mapa. El buscador de filtro-en-vivo de `/clases` (`ClassBrowser.tsx`) queda deliberadamente fuera de esta ronda — necesita lógica de debounce-y-disparar-una-vez que no se pudo resolver reusando un handler existente, a diferencia del Home donde `navigateSearch()` ya es un único punto de convergencia real.
>
> **v5 (2026-08-28, misma fecha que v4):** segundo pase de análisis pedido con foco en tres preguntas de negocio — *¿medimos registros de academias/profesores/alumnos?*, *¿cuántas clases se visualizan?*, *¿cuánta gente se conecta con el profesor?* — más una petición de recomendaciones. Las dos primeras ya estaban cubiertas (`sign_up`+`role`, `select_item`/`view_item`); la tercera reveló que **todo el embudo estaba construido sobre la clase como unidad y el perfil no tenía equivalente**, que es exactamente el lado que le importa a una academia:
> - **`view_profile` + `select_profile` (3.12)** — el espejo de `view_item`/`select_item` para perfiles de profesor y academia. 6 superficies de clic que no medían nada (Home ×3, directorio `/profesores`, detalle de clase, mapa) y la vista de perfil en sí, que nunca se contó. Sin esto no se podía responder "¿cuántas visitas tuvo el perfil de esta academia?".
> - **`teacher_social_click` (3.13)** — los links de Instagram/TikTok/web del profesor llevaban a dominios externos sin ningún tracking: el visitante se iba de Kynea a contactarlo y no quedaba rastro.
> - **Recomendaciones registradas, no implementadas** (ver sección 7, priorizadas): `search_no_results` (la lista de compras de qué profesores/estilos captar), `filter_applied` (demanda real por estilo/nivel/día, independiente del catálogo publicado), `search` en `/clases`, y eventos de retención del lado profesor (`class_status_changed`, edición de clase).

## 1. Contexto general de la implementación

- **Contenedor GTM:** `GTM-KVGV4DR9`.
- **Cuándo se activa:** solo cuando `NEXT_PUBLIC_APP_ENV=production` (el entorno de Producción real en Vercel). En local/dev y en preview deploys, GTM ni siquiera se carga — nada de lo que sigue va a verse funcionando fuera de producción.
- **Mecanismo:** todo el código de tracking vive en un solo archivo, `lib/analytics.ts`. Cada función ahí hace un `window.dataLayer.push({ event: '...', ...parámetros })`.
- **Importante:** empujar al `dataLayer` por sí solo **no manda nada a GA4**. Cada evento necesita, del lado de GTM:
  1. Una o más **Variables de capa de datos** (una por cada parámetro del evento).
  2. Un **Trigger** de tipo "Evento personalizado" con el nombre exacto del evento.
  3. Un **Tag** de tipo "Evento de GA4" que mapea esas variables a parámetros del evento en GA4, disparado por ese Trigger.
  4. Probarlo en modo **Preview** antes de publicar.
  5. **Publicar** el contenedor — sin este paso, todo queda solo en el workspace de GTM.

## 2. El embudo de registro hoy (post-separación de audiencias)

Antes, `/registro` y `/unete` eran una sola pantalla con selector de rol. Ahora:

**Alumno:**
```
Header "Iniciar sesión" / CTAs varios → /registro (form directo, sin selector de rol)
  → [Google: /auth/callback]  |  [Email: /confirmar-email (OTP)]
  → /onboarding?new=1  (AlumnoWelcome — carrusel de 3 slides, sin datos)
  → /clases (o el redirect original, ej. la clase que quería contactar)
```

**Profesor:**
```
Header "Únete como profesor" → /unete/beneficios (landing de valor)
  → CTA del hero ("Publica tu primera clase →") → /unete (form directo, sin selector de rol)
  → [Google: /auth/callback o /completar-registro si no traía rol]  |  [Email: /confirmar-email (OTP)]
  → /onboarding?new=1  (wizard de 4 pasos: Datos públicos → Contacto → Especialidad → Validación)
  → /dashboard
```

**Academia (nuevo desde v4 — ya existía en código, no estaba mapeado):**
```
Header/drawer "¿Tienes una academia?" → /academias (form directo, sin selector de rol — role: 'academia' hardcodeado)
  → [Google: /auth/callback]  |  [Email: /confirmar-email (OTP)]
  → /onboarding?new=1  (mismo wizard de 4 pasos que profesor)
  → /dashboard
```
`/academias` usa el mismo hook `useSignupForm(role)` que `/unete` (`lib/auth/useSignupForm.ts`), solo con `role: 'academia'` en vez de `'profesor'` — mismo mecanismo de resolución de rol, mismos eventos (`auth_attempt`, `sign_up`, `onboarding_step_complete`, `onboarding_complete`) ya cubiertos por el código compartido. No es una landing de valor como `/unete/beneficios` — es el formulario de registro en sí, análogo a `/registro`/`/unete`.

`/completar-registro` es el único punto donde el rol se elige explícitamente (Google sin rol preseleccionado, ej. si entró por `/login` en vez de `/registro`, `/unete` o `/academias`) — ahí el usuario elige entre las 3 opciones (Alumno/Profesor/Academia) manualmente.

## 3. Eventos — implementados vs. propuestos

### 3.1 `sign_up` — cuenta creada (implementado, sin cambios)

- **Qué mide:** la conversión final del embudo de **registro** (no de onboarding — ver 3.5/3.6, esa es una brecha real) — se dispara **una sola vez**, cuando el usuario efectivamente termina de crear su cuenta.
- **Dónde en el código:** `app/onboarding/page.tsx`, gated por `?new=1` (los 4 puntos reales de fin de registro: email con sesión inmediata, email con OTP, Google con rol preseleccionado, Google vía `/completar-registro`).
- **Ojo:** se dispara al **entrar** a `/onboarding?new=1`, es decir cuando la cuenta ya existe en Supabase — no cuando el perfil (bio, WhatsApp, estilos, etc.) queda completo. Un profesor puede tener `sign_up` sin nunca haber terminado su perfil, y hoy eso no se mide en ningún lado (por eso se propone 3.6).
- **Parámetros:** `role` (`alumno`/`profesor`/`academia`), `method` (`email`/`google`).

### 3.2 `generate_lead` — contacto con un profesor (implementado, re-verificado)

- **Qué mide:** la conversión principal del marketplace — cuando un alumno logueado efectivamente abre WhatsApp o Instagram para contactar a un profesor.
- **Re-verificado en esta ronda — 6 puntos reales donde dispara hoy:**
  | Archivo | Contexto |
  |---|---|
  | `components/ClassCard.tsx` | Botón "Contactar" del card (Home, `/clases`, filas destacadas) |
  | `components/ContactModal.tsx` | Caso: usuario logueado pero el profesor no tiene el canal configurado (WhatsApp/Instagram) — el modal ofrece la alternativa disponible |
  | `app/clases/[id]/ClaseDetailClient.tsx` | Botones de contacto del panel lateral (desktop) y la barra fija (mobile) — mismo handler, ambos disparan |
  | `app/profesores/[slug]/ProfesorDetailClient.tsx` | Botón de contacto en el perfil público del profesor |
  | `app/mapa/MapaClient.tsx` | Botón de contacto en el popup de un marcador del mapa |
- **Importante, confirmado sin cambios:** **no** se dispara cuando un usuario sin sesión ve el gate de registro/login en `ContactModal.tsx` — ese caso dispara `auth_cta_click` (ver 3.3), no `generate_lead`. Solo cuenta el contacto real de alguien ya logueado.
- **Parámetros:** `lead_channel` (`whatsapp`/`instagram`), `class_id`, `class_name`, `class_style`, `teacher_id`, `teacher_name`.
- **Conclusión de la revisión pedida:** el evento y su lógica de "solo usuarios logueados" siguen siendo correctos tal cual — no hace falta tocar código acá, solo la tabla de ubicaciones de `auth_cta_click` de abajo cambió.

### 3.3 `auth_cta_click` — clic de intención hacia registro/login (implementado, tabla de ubicaciones actualizada)

- **Qué mide:** el primer paso del embudo — cualquier clic en un link/botón que lleva a `/registro`, `/unete`, o `/login`.
- **Parámetros:** `auth_action` (`registro`/`login`), `cta_location`.

  | `cta_location` | Dónde está | Estado |
  |---|---|---|
  | `header_desktop_profesor` | "Únete como profesor" del Header estándar (páginas fuera del Home) — lleva a `/unete/beneficios` | vigente |
  | `header_desktop_academia` | "¿Tienes una academia?" del Header estándar (páginas fuera del Home) — lleva a `/academias` | **v4, nuevo** |
  | `header_desktop` | "Iniciar sesión" del Header estándar (páginas fuera del Home) | **v4, nuevo** — no estaba documentado, ya existía |
  | `header_mobile` | "Iniciar sesión" del drawer mobile (todo el sitio) | **v4, nuevo** — no estaba documentado, ya existía |
  | `header_mobile_registro` | "Regístrate gratis" del drawer mobile (todo el sitio) | **v4, nuevo** — no estaba documentado, ya existía |
  | `header_mobile_profesor` | "Sé profesor en Kynea" del drawer mobile (todo el sitio) — lleva a `/unete/beneficios` | **v4, regresión arreglada** — el drawer rediseñado (`components/Header.tsx`, `CONVERSION_LINKS`) había dejado de disparar esto; restaurado con el mismo nombre |
  | `header_mobile_academia` | "¿Tienes una academia?" del drawer mobile (todo el sitio) — lleva a `/academias` | **v4, nuevo** (mismo fix que la fila anterior) |
  | `header_home_desktop` | "Iniciar sesión" del hero del Home (desktop, `homeNav`) | **v4, nuevo** |
  | `header_home_desktop_registro` | "Regístrate gratis" del hero del Home (desktop, `homeNav`) | **v4, nuevo** |
  | `header_home_desktop_profesor` | "Sé profesor" junto al logo del hero del Home (desktop, `homeNav`) — lleva a `/unete/beneficios` | **v4, nuevo** — distinto del `header_desktop_profesor` de arriba (mismo destino, superficie distinta) |
  | `header_home_desktop_academia` | "¿Tienes una academia?" junto al logo del hero del Home (desktop, `homeNav`) — lleva a `/academias` | **v4, nuevo** |
  | `header_home_mobile_registro` | Pill "Regístrate" junto al hamburger del hero del Home (mobile, `homeNav`) | **v4, nuevo** |
  | `beneficios_hero` | "Publica tu primera clase →", hero de `/unete/beneficios` (lleva a `/unete`) | vigente |
  | `beneficios_cta_final` | CTA de cierre al fondo de `/unete/beneficios` | vigente |
  | `home_teacher_cta` | "Publicar mi primera clase →" (sección "¿Eres profesor o academia?" del Home) | vigente, pero **desde el rediseño del Home ahora está oculta para profesor/academia ya logueados** (antes visible siempre) — el evento no cambió, solo quién puede dispararlo. Sigue saltando directo a `/unete` sin pasar por la landing de beneficios; inconsistencia de producto no resuelta (decisión pendiente, ver 3.3 v1-v3). |
  | `home_bottom_ribbon` | "Registrarme gratis" del banner morado fijo al fondo del Home (solo sin sesión) | vigente |
  | `contact_modal_desktop` / `contact_modal_mobile` | Botones del modal de contacto cuando no hay sesión | vigente |
  | `registro_page` | Link "Inicia sesión" dentro de `/registro` | vigente |
  | `unete_page` | Link "Inicia sesión" dentro de `/unete` | vigente |
  | `academias_page` | Links "Inicia sesión" (`login`) y "Regístrate aquí" hacia `/unete` (`registro`) dentro de `/academias` | **v4** — `login` ya existía; el link de `registro` era un hueco real, arreglado en v4 |
  | `login_page` | Link "Regístrate gratis" dentro de `/login` | vigente |
  | `confirmar_email_page` | Links "Volver al registro" en la pantalla de confirmación | vigente |
  | `reset_password_page` | Link "Ir al login" en enlace de recuperación inválido/expirado | vigente |
  | `auth_error_banner` | Banner de error de autenticación tras un enlace roto | vigente |
  | `save_class_gate` | Botón "Guardar clase" sin sesión | vigente |

  No existe un `cta_location` para el link "Conoce todos los beneficios →" que aparece dentro de `/unete` hacia `/unete/beneficios` — no es un CTA de auth (no lleva a login/registro), así que queda fuera del alcance de este evento. Lo mismo aplica al link "Convierte tu cuenta en academia" del drawer mobile para un profesor logueado (`/convertir-academia`) — no lleva a login/registro, así que no lleva `ctaLocation` a propósito. Si se quiere medir alguno de estos tránsitos, sería un evento aparte (ej. `select_content`), no cubierto en este documento salvo que lo pidan.

### 3.4 `auth_attempt` — intento real de registro/login (implementado, sin cambios)

- **Qué mide:** cuando la persona ya está en `/registro`, `/unete` o `/login` y efectivamente envía el formulario o hace clic en "Continuar con Google".
- **Dónde en el código:** `app/registro/page.tsx`, `app/unete/UneteClient.tsx`, `app/login/page.tsx`, `app/confirmar-email/page.tsx` (verificación OTP, `method: 'email_otp'`), `app/completar-registro/CompletarRegistroClient.tsx` (confirmación de rol tras Google).
- **Parámetros:** `auth_action` (`registro`/`login`), `auth_method` (`email`/`google`/`email_otp`).

---

### 3.5 `onboarding_step_complete` — progreso dentro del wizard (implementado — corrección de estado, v4: esta sección decía "PROPUESTO" pero ya estaba en código sin que el documento se actualizara)

- **Por qué faltaba (contexto original):** hoy `sign_up` mide "cuenta creada", pero nada mide si la persona efectivamente avanza o abandona el onboarding — que para un profesor es un wizard real de 4 pasos con datos obligatorios (WhatsApp o Instagram, al menos un estilo).
- **Dónde está:** `lib/analytics.ts` (`trackOnboardingStepComplete`), disparado en `app/onboarding/page.tsx:214`, dentro de `handleNext()`, justo después de que `validateStep()` pasa y antes de `setStep(s => s + 1)`.
- **Parámetros:** `role` (`profesor`/`academia`), `step_number` (0-indexed), `step_name` (`Datos públicos` / `Contacto` / `Especialidad` — el paso 3 "Validación" no dispara esto, lo cubre 3.6).
- **Alumno:** no tiene este evento — su "onboarding" es el carrusel de `AlumnoWelcome.tsx` (3 slides informativos, sin datos), cubierto directamente por 3.6 con el parámetro `skipped`.
- **Matiz de interpretación verificado tras implementar:** ver 9.10 — el conteo mide *veces que se superó un paso*, no *personas únicas que llegaron a ese paso*; en GA4 conviene leer usuarios únicos, no conteo de eventos.

### 3.6 `onboarding_complete` — perfil/cuenta lista para usar (implementado — misma corrección de estado que 3.5)

- **Qué mide:** el cierre real del embudo de registro — cuando el perfil queda utilizable. Profesor/academia: `app/onboarding/page.tsx:301`, dentro de `handleFinish()`, después de que `updateProfile()` guarda. Alumno: `app/onboarding/AlumnoWelcome.tsx:44`, dentro de `finish()`, sea que completó los 3 slides o tocó "Omitir".
- **Parámetros:** `role`, y `skipped: boolean` (siempre `false` para profesor/academia; para alumno, `true` si vino del botón "Omitir").
- **Con esto, el embudo completo de registro queda:**
  ```
  auth_cta_click → auth_attempt → sign_up → onboarding_step_complete (×2-3, solo profesor/academia) → onboarding_complete
  ```
  Permite ver en GA4 exactamente en qué paso se cae la gente — hoy esa visibilidad no existe.

### 3.7 Creación de clases (implementado 2026-08-06)

- **Por qué faltaba:** `CrearClaseForm.tsx` es un wizard de 4 pasos (`Información básica` → `Horario y ubicación` → `Precio y detalles` → `Revisión y publicación`) y no disparaba ningún evento — ni de progreso ni de publicación. Es la acción de negocio más importante del lado profesor (equivalente a `generate_lead` del lado alumno).
- **`create_class_step_complete`** — `lib/analytics.ts` (`trackCreateClassStepComplete`), disparado en `goNext()`, `app/dashboard/crear-clase/CrearClaseForm.tsx:479`. Parámetros: `step_number`, `step_name`, `is_edit`.
  - **Hallazgo (deviation del supuesto original):** a diferencia de `onboarding`'s `handleNext()` (que valida antes de avanzar), `goNext()` en este wizard **no tiene ningún gate de validación** — avanza siempre, sin importar si los campos requeridos están llenos. La validación real (`validateForPublish`) solo corre en el submit final. Esto significa que `create_class_step_complete` se dispara en **cada clic de "Continuar"**, no solo en "avance real" como sí ocurre con `onboarding_step_complete`. No hay forma de replicar el patrón "solo cuenta avance validado" sin agregar validación por paso que hoy no existe — se implementó fiel al código real, no al supuesto del informe original.
- **`class_created`** — `trackClassCreated`, en el `try` de `handlePublish`, justo después de `await createClass(fd)` (`CrearClaseForm.tsx:546`) — nunca para `updateClassFromForm` (edición). Parámetros: `status`, `class_type`, `class_style`.
- **`create_class_blocked`** — `trackCreateClassBlocked`, en la rama `payload?.code === 'MISSING_CONTACT_CHANNEL'` del `catch` (`CrearClaseForm.tsx:560`).
  - **Hallazgo:** el mismo bloque `try/catch` envuelve tanto `createClass` como `updateClassFromForm` — este error puede ocurrir también al **editar** una clase existente (un profesor republica sin tener WhatsApp/Instagram configurado), no solo al crear una nueva. Se agregó `is_edit: boolean` como parámetro (no estaba en la spec original, que no mencionaba parámetros para este evento) para no perder ese contexto.

### 3.8 Visualización de clases (implementado 2026-08-06)

- **Por qué faltaba:** no había forma de ver en GA4 qué clases se ven más, ni desde qué parte del sitio llega el tráfico a cada detalle de clase.
- **`view_item`** — `trackViewItem`, en un `useEffect` de `ClaseDetailClient.tsx:46` (dependiente de `cls.id`). Parámetros: `class_id`, `class_name`, `class_style`, `class_type`, `teacher_id`, `price`.
  - **Nota v4:** el archivo vivía en `app/clases/[id]/ClaseDetailClient.tsx` cuando se escribió esta sección; la ruta pública cambió a `app/[categoria]/[tipo]/[slug]/ClaseDetailClient.tsx` (slugs por categoría/tipo, no `[id]`) — mismo componente, mismo evento, solo la ruta física cambió. Referencias de archivo en el resto del documento ya actualizadas.
- **`select_item`** — `trackSelectItem`, con `listName` como prop nuevo y obligatorio de `ClassCard` (`components/ClassCard.tsx`).
  - **Hallazgo importante — la tabla de orígenes del informe original estaba equivocada en un punto:** `/mapa` **no usa `ClassCard`** — tiene su propio popup/bottom-sheet con markup independiente (`app/mapa/MapaClient.tsx`). Solo hay **4 usos reales de `ClassCard`**, no 5. El quinto `listName` (`mapa`) se instrumentó directo en el Link "Ver clase" propio de `MapaClient.tsx:182` (compartido entre el popup desktop y el bottom-sheet mobile — no hay `md:` en ese wrapper, así que un solo punto cubre ambos viewports).
  - Dentro de `ClassCard` hay **dos** puntos de navegación hacia `/clases/[id]` (el `Link` de la imagen y el botón "Ver clase") — ambos disparan `select_item`, para no perder los clics hechos sobre la imagen.
  - Tabla final de `listName` implementados:
    | Origen | `listName` | Archivo:línea del `<ClassCard>` / Link |
    |---|---|---|
    | Home — "Clases de baile para ti" | `home_recommended` | `app/HomeClient.tsx:523` |
    | Home — filas de estilo destacado | `home_featured_{style}` | `app/HomeClient.tsx:138` (dentro de `FeaturedCategoryRow`) |
    | `/clases` (grid con filtros) | `clases_grid` | `app/clases/ClasesContent.tsx:303` |
    | `/profesores/[slug]` (clases del profesor) | `profesor_detail` | `app/profesores/[slug]/ProfesorDetailClient.tsx:146` |
    | Vista Mapa (popup + lista lateral), cualquier superficie | `{listName}_mapa` (ej. `clases_grid_mapa`, `categorias_grid_mapa`) | **v4, reescrito** — ver nota abajo |
  - **Nota v4 — `app/mapa/MapaClient.tsx` ya no existe.** El `/mapa` standalone (CSS falso, sin Google Maps real) fue reemplazado por una vista Mapa embebida dentro de `/clases` y `/categorias/[slug]` (`ClasesMapView.tsx`, toggle Lista/Mapa en `ClassBrowser.tsx`) — `app/mapa/page.tsx` ahora solo redirige a `/clases?vista=mapa` para no romper links viejos. El `listName` fijo `'mapa'` que documentaba v1-v3 **nunca se migró** a la nueva vista — los links "Ver clase" del popup y de la lista lateral del mapa no disparaban `select_item` en absoluto hasta este fix. Ahora `ClasesMapView` recibe `listName` como prop desde `ClassBrowser` (`${listName}_mapa`), así se puede distinguir en GA4 un clic hecho desde la grilla normal de uno hecho desde el mapa, en la misma página.
  - Parámetros de `select_item`: `class_id`, `class_name`, `class_style`, `teacher_id`, `list_name` (no estaban explícitos en la spec original más allá de exigir `listName` — se completó con el mismo criterio de `generate_lead`/`view_item` para que el evento sea útil sin depender de un join externo).
- Con `select_item` + `view_item` + `generate_lead` juntos se arma el embudo completo de descubrimiento: *dónde vio la clase → entró al detalle → contactó*.

### 3.9 `search` — búsqueda enviada desde el Home (implementado 2026-08-28)

- **Por qué faltaba:** era un candidato descartado en la lista original (sección 7) por bajo valor — con el rediseño del buscador del Home a estilo VRBO (overlays mobile a pantalla completa, autocomplete con sección "Estilos" en desktop, campo de ciudad independiente) pasó a valer la pena: hoy no hay forma de ver en GA4 cuánta gente usa el buscador ni qué términos no encuentran resultados.
- **Dónde está:** `trackSearch`, `lib/analytics.ts`, disparado dentro de `navigateSearch()` en `app/HomeClient.tsx` — el único punto real de convergencia de las 3 formas de enviar una búsqueda (submit del form desktop, botón "Buscar" mobile, link "Ver todos los resultados →" del dropdown/overlay). Escribir o navegar el autocomplete **no** dispara esto — solo un envío real, igual que el criterio ya usado para `auth_attempt`/`sign_up`.
- **Parámetros:** `search_term` (texto del campo de estilo/clase/profesor, puede venir vacío si solo se llenó ciudad), `city` (puede venir vacío si solo se buscó por estilo). No se dispara si ambos campos están vacíos.
- **Deliberadamente fuera de esta ronda:** el buscador de filtro-en-vivo de `/clases` (`components/ClassBrowser.tsx`) no tiene un "submit" — filtra en cada tecla (`handleQueryChange`). Instrumentarlo bien requiere debounce-y-disparar-solo-al-asentarse (patrón GA4 recomendado para no generar un evento por tecla), que no se pudo resolver reusando un handler existente como en el Home. Queda como candidato pendiente (ver sección 7).

### 3.10 `save_class` — clase guardada como favorita (implementado 2026-08-28)

- **Por qué faltaba:** era un candidato descartado en la lista original (sección 7) — el botón de guardar (ícono de marcador) ya existía en `ClaseDetailClient.tsx`, con `saved_classes` como tabla real en Supabase, pero nunca se medía. La rama sin sesión de ese mismo botón sí estaba cubierta (`auth_cta_click({ location: 'save_class_gate' })`).
- **Dónde está:** `trackSaveClass`, `lib/analytics.ts`, disparado en `toggleSave()` de `ClaseDetailClient.tsx`, justo después de un insert exitoso en `saved_classes` (incluye el caso `23505` — ya estaba guardado en otra pestaña, tratado como éxito). **No se dispara al des-guardar** — mide la intención de favorito, no cada toggle.
- **Parámetros:** `class_id`, `class_name`, `class_style`, `teacher_id` — mismo criterio que `generate_lead`/`select_item`, útil sin depender de un join externo.

### 3.11 `map_view_toggle` — cambio entre vista Lista/Mapa (implementado 2026-08-28)

- **Por qué faltaba:** preguntado directamente — "cuántas veces seleccionan mapa al explorar clases". El toggle Lista/Mapa (`ClassBrowser.tsx`) es estado local de React (`useState`), no cambia la URL, así que ni un pageview automático de GA4 lo detectaba. Es un hueco encontrado en esta misma ronda, no un candidato de la lista original.
- **Dónde está:** `trackMapViewToggle`, `lib/analytics.ts`, disparado desde un wrapper único `changeView()` en `ClassBrowser.tsx` que reemplaza las 4 formas de cambiar de vista (el switch Lista/Mapa de escritorio, el botón flotante "Mapa" de mobile, el botón "Volver a lista" de mobile, y el callback `onShowList` que le pasa a `ClasesMapView`) — un solo punto, sin duplicar el `pushEvent` cuatro veces. **No se dispara** en la vista inicial resuelta desde `?vista=mapa` al montar, ni al tocar la opción ya activa (guard `if (next === view) return`).
- **Parámetros:** `view_type` (`'lista'`/`'mapa'`, el destino del cambio), `list_name` (misma superficie que `select_item`/`view_item` — `clases_grid`, `categorias_grid` — para poder comparar el uso del mapa entre `/clases` y `/categorias/[slug]`).
- **Relacionado:** ver la nota de 3.8 sobre `select_item` en el mapa — mismo hallazgo (vista embebida nueva, sin migrar el tracking viejo), arreglado en el mismo pase.

### 3.12 `view_profile` / `select_profile` — el lado profesor/academia del embudo de descubrimiento (implementado 2026-08-28)

- **Por qué faltaba:** el hallazgo más importante del re-análisis de v5. Todo el embudo de descubrimiento estaba construido alrededor de la **clase** como unidad (`select_item` → `view_item` → `generate_lead`), y el **perfil** — que para una academia *es* su vidriera en Kynea — no tenía ningún equivalente. No se podía responder "¿cuántas visitas tuvo el perfil de esta academia este mes?", que es justamente el argumento con el que se capta y se retiene una academia.
- **`view_profile`** — `trackViewProfile`, en un `useEffect` de `app/profesores/[slug]/ProfesorDetailClient.tsx` (dependiente de `teacher.id`), el espejo exacto de `view_item`. Parámetros: `role` (`profesor`/`academia`), `profile_id`, `profile_name`.
  - **Por qué un evento aparte y no `view_item` con un parámetro:** un perfil no es un ítem de catálogo — no tiene `price` ni `class_type`, y mezclarlos rompería cualquier embudo o métrica de e-commerce armada sobre `view_item`. Mismo criterio que ya se aplicó al separar `save_class` de `generate_lead`.
- **`select_profile`** — `trackSelectProfile`, el espejo de `select_item`. Parámetros: `role`, `profile_id`, `profile_name`, `list_name`. Los 6 puntos donde un perfil se puede clickear desde un listado, ninguno de los cuales medía nada antes:
  | Origen | `listName` | Archivo |
  |---|---|---|
  | Home — grid de academias | `home_academias` | `app/HomeClient.tsx` |
  | Home — carrusel de profesores | `home_profesores` | `app/HomeClient.tsx` |
  | Home — autocomplete del buscador (`goToProfile`) | `home_search_autocomplete` | `app/HomeClient.tsx` |
  | Directorio `/profesores` (profesores y academias) | `profesores_directorio` | `app/profesores/page.tsx` vía `components/TrackedProfileLink.tsx` |
  | Detalle de clase → perfil del profesor (5 links: nombre en cabecera, avatar y nombre del bloque profesor, en desktop y mobile) | `clase_detail` | `ClaseDetailClient.tsx` |
  | Mapa — popup y lista lateral de academias | `{listName}` (ej. `clases_grid_mapa`) | `components/ClasesMapView.tsx` |
  - **Nota de implementación:** `app/profesores/page.tsx` es un Server Component, así que no puede llevar un `onClick`. Se agregó `components/TrackedProfileLink.tsx`, un wrapper cliente mínimo (href + params de tracking + className + children) — mismo patrón que ya usa el repo para cruzar la frontera server/client sin convertir toda la página a cliente.

### 3.13 `teacher_social_click` — clic a los canales propios del profesor (implementado 2026-08-28)

- **Por qué faltaba:** en el detalle de clase y en el perfil del profesor se muestran sus links de Instagram, TikTok y sitio web. Son enlaces a dominios externos: el visitante **se va de Kynea hacia el profesor y no queda ningún rastro**. Es contacto real que ocurrió, invisible en GA4 — una fuga silenciosa de la conversión principal del marketplace.
- **Dónde está:** `trackTeacherSocialClick`, disparado en los 3 links de `ProfesorDetailClient.tsx` (`surface: 'profesor_detail'`) y en los mismos 3 de `ClaseDetailClient.tsx`, que existen duplicados en su bloque desktop y en el mobile (`surface: 'clase_detail'`).
- **Parámetros:** `social_channel` (`instagram`/`tiktok`/`website`), `teacher_id`, `teacher_name`, `surface`.
- **Deliberadamente NO es `generate_lead`:** ese evento es la conversión de negocio (alguien decidió contactar por el canal que Kynea le ofrece) y debe quedar limpio. Un clic al Instagram del profesor es exploratorio — puede terminar en contacto o no. Meterlo en `generate_lead` inflaría la conversión con intención mucho más débil. Si más adelante se quiere una métrica combinada de "contacto total", se suman los dos eventos en el reporte, que es reversible; contaminar el evento no lo es.

## 4. Qué falta programar antes de poder configurar todo esto en GTM

GTM solo puede reaccionar a eventos que **ya se están empujando al `dataLayer`**. Estado al cierre de v5: **los 16 eventos de la sección 3 (3.1–3.13) ya están en código** — no queda ningún evento "propuesto sin código". El orden correcto para lo que falta:

1. **Deploy a producción** de los cambios de v4+v5 (fixes de `auth_cta_click` en el drawer mobile y `/academias`, fix de `select_item` en el mapa, más `search`/`save_class`/`map_view_toggle`/`view_profile`/`select_profile`/`teacher_social_click` nuevos) — igual que todo lo anterior, nada de esto se ve en ningún lado (ni siquiera en GTM Preview) hasta que `NEXT_PUBLIC_APP_ENV=production` sirva ese código.
2. **Configurar en GTM** (sección 6) — Variables + Trigger + Tag por cada evento que todavía no tenga su configuración, Preview, Publicar.

Los eventos de 3.1–3.8 (y sus ubicaciones nuevas de `auth_cta_click` de la tabla de 3.3) se pueden configurar en GTM **ya mismo** una vez desplegados — no dependen de ningún cambio de código adicional. Los 6 de v4/v5 (`search`, `save_class`, `map_view_toggle`, `view_profile`, `select_profile`, `teacher_social_click`) son punta a punta nuevos: código y configuración de GTM, ambos pendientes.

## 5. El embudo completo que esto permite armar en GA4

```
Registro:                auth_cta_click → auth_attempt → sign_up → onboarding_step_complete (×N) → onboarding_complete
Creación:                create_class_step_complete (×N) → class_created
Descubrimiento (clase):  search / map_view_toggle → select_item   → view_item    → generate_lead → save_class
Descubrimiento (perfil): search / map_view_toggle → select_profile → view_profile → generate_lead / teacher_social_click
```

Dos aclaraciones para leer bien estos embudos:

- **`map_view_toggle` es paralelo a `search`, no secuencial** — son dos formas alternativas de entrar al descubrimiento (buscar algo puntual vs. explorar visualmente por zona), no pasos uno-después-del-otro.
- **Los dos embudos de descubrimiento convergen en `generate_lead`**, que no distingue si el contacto salió de una clase o de un perfil (sí trae `class_id` cuando viene de una clase, así que se puede separar en el reporte). El embudo de perfil es el que importa para el lado academia: `select_profile → view_profile` es literalmente "cuánta exposición le dio Kynea a esta academia".

Con `cta_location` / `step_name` / `list_name` puedes comparar qué punto de entrada, paso o superficie convierte mejor — y ver exactamente dónde se cae la gente en cada uno de los tres embudos.

## 6. Cómo conectar cada evento en GTM (mismo procedimiento para todos)

Por cada evento:

1. **Variables → Nueva → Variable de capa de datos** (tipo "Versión 2"), una por cada parámetro. Ejemplo para `auth_cta_click`: `DLV - auth_action`, `DLV - cta_location`.
2. **Triggers → Nuevo → Evento personalizado**, nombre del evento exacto (ej. `auth_cta_click`).
3. **Tags → Nuevo → Evento de Google Analytics: GA4**:
   - Configuration Tag: tu tag de configuración GA4 existente.
   - Nombre del evento: el mismo nombre.
   - Parámetros del evento: mapear cada `DLV - ...` a su parámetro.
   - Trigger: el que creaste en el paso 2.
4. **Modo Preview**, conectado a producción (o donde `NEXT_PUBLIC_APP_ENV=production`), y probar cada acción real en el sitio.
5. **Enviar → Publicar**, con una descripción clara del cambio. Sin este paso, nada llega a GA4 real.

(Opcional) En GA4 → Admin → Eventos, marcar `sign_up`, `onboarding_complete`, `class_created` y `generate_lead` como conversiones — son las métricas de negocio reales de cada lado (alumno se registra, termina de armar su perfil / profesor publica su primera clase / alumno contacta). Los demás son pasos de embudo/diagnóstico.

**No marcar como conversión** `teacher_social_click` (3.13) ni `view_profile` (3.12), aunque tenga la tentación: el primero es intención exploratoria más débil que `generate_lead` y marcarlo inflaría la métrica de contacto; el segundo es una vista, no una acción. `view_profile` sí conviene tenerlo a mano como **métrica de reporte para academias** (cuántas visitas tuvo su perfil), que es un uso distinto de una conversión.

## 7. Candidatos descartados o pendientes de re-priorizar

De la lista original de candidatos no implementados, `view_item` y `select_item` pasaron a la sección 3.8, y `search`/`save_class` pasaron a 3.9/3.10 (ambos en alcance ahora). Lo que queda, **priorizado** (recomendaciones de v5, discutidas y registradas pero todavía sin implementar):

**Prioridad media — insight de producto puro, el mejor retorno por esfuerzo:**

| Candidato | Qué respondería | Dónde iría |
|---|---|---|
| `search_no_results` | **El más valioso del grupo:** qué busca la gente que Kynea *no tiene*. Es literalmente la lista de compras de qué profesores/estilos/ciudades captar. Hoy esa demanda insatisfecha se pierde en silencio. | Rama "Sin resultados" de `ClassBrowser.tsx` y del overlay/dropdown del buscador del Home |
| `filter_applied` (`filter_type`, `filter_value`) | Demanda real por estilo/nivel/día/modalidad, **independiente de lo que hay publicado** — complementa a `search_no_results`. Hoy los 6 filtros de `/clases` no miden nada. (Matiz: los filtros sí van a la URL vía `router.replace`, así que algo podría inferirse de `page_view`, pero queda enterrado en query params, no como dimensión usable.) | `useClassFilters.ts` / `FilterPanel.tsx` |
| `search` en `/clases` | Completa el par con el buscador del Home (3.9). Requiere debounce-y-disparar-una-vez: filtra en vivo, sin submit, así que sin debounce genera un evento por tecla. | `components/ClassBrowser.tsx` |

**Prioridad baja — retención del lado profesor, para cuando haya más volumen:**
- `class_status_changed` (publicar / pausar / archivar en `MisClasesClient.tsx`) — señal temprana de que un profesor se está por ir.
- Edición de clase — hoy solo se mide la creación (`class_created` nunca dispara en `updateClassFromForm`).
- Des-guardar una clase (`toggleSave()` con `saved`=true) — 3.10 solo mide guardar; bajo valor salvo que interese medir abandono de favoritos específicamente.

## 8. Cosas a tener en cuenta antes de activar todo esto en GTM

- **Nada de esto se ve fuera de producción.** Probar en local/dev no muestra actividad en GTM Preview salvo que se fuerce `NEXT_PUBLIC_APP_ENV=production` en ese entorno.
- **Revisar `COMING_SOON_MODE` en Vercel.** Si esa variable está en `true` en producción, `proxy.ts` reescribe *todo* el sitio a una página "Próximamente" — ningún evento podría dispararse.
- Los eventos ya en código son inofensivos mientras GTM no tenga un Trigger para ellos — se pueden dejar "dormidos" el tiempo que se quiera antes de conectarlos. Lo mismo aplicará a los nuevos una vez implementados.

## 9. Deep dive: arquitectura de auth (login + registro) — hallazgos técnicos

Esta sección responde una pregunta puntual: **¿el registro de alumno y de profesor es "una sola medición" o dos?, y en el login (que no pide rol), ¿cómo se sabe si quien inició sesión es alumno, profesor o academia?** Todo lo que sigue está verificado línea por línea contra el código real (no es especulación) — cada referencia es archivo:línea o nombre de función exacto.

### 9.1 Principio general: un evento, un parámetro `role` — no forkear nombres de evento

Es tentador pensar "el alumno tiene su propio registro ahora, entonces necesito marcaciones separadas para esa experiencia, y otras para la de profesor". La recomendación técnica es **no crear `sign_up_alumno` / `sign_up_profesor` como eventos distintos** — en GA4 eso rompe Funnel Exploration nativo (que espera un solo nombre de evento por paso), obliga a duplicar toda la config de GTM (Variables + Trigger + Tag) por cada variante, y no gana nada analíticamente que no se gane ya con un parámetro.

Lo correcto: **un solo evento con `role` (o `auth_action`) como dimensión**, y la separación de audiencias se hace **a nivel de reporte**, no de instrumentación — dos Funnel Explorations en GA4, uno filtrado a los `cta_location`/`role` del camino alumno, otro a los del camino profesor, ambos leyendo el mismo set de eventos. Esto ya es posible hoy con los eventos actuales, porque los valores de `cta_location` son mutuamente excluyentes por audiencia (ej. `header_desktop_profesor` solo existe en el camino profesor; `login_page`→registro solo en el de alumno).

### 9.2 Cómo se resuelve el `role` hoy, mapeado por método exacto

| Método de entrada | ¿Dónde se conoce el `role`? | Archivo:línea |
|---|---|---|
| Registro por correo en `/registro` | Hardcodeado `role: 'alumno'` en el propio `signUp()` | `app/registro/page.tsx:76` |
| Registro por correo en `/unete` | `role: 'profesor'`, pasado a `useSignupForm('profesor')` | `app/unete/UneteClient.tsx`, `lib/auth/useSignupForm.ts:62-66` (`signUp()` compartido) |
| Registro por correo en `/academias` (**v4, nuevo**) | `role: 'academia'`, pasado a `useSignupForm('academia')` — mismo hook y mismo `signUp()` que `/unete`, solo cambia el argumento | `app/academias/AcademiasClient.tsx`, `lib/auth/useSignupForm.ts:62-66` |
| Google desde `/registro` | Viaja como query param `?role=alumno` en la URL de callback | `app/registro/page.tsx:104` |
| Google desde `/unete` | Viaja como query param `?role=profesor` en la URL de callback | `lib/auth/useSignupForm.ts:90-91` |
| Google desde `/academias` (**v4, nuevo**) | Viaja como query param `?role=academia` en la URL de callback — mismo mecanismo, mismo código | `lib/auth/useSignupForm.ts:90-91` |
| Google desde `/login` (sin rol preseleccionado) | **No se conoce hasta después** — si el perfil ya tiene `role` en BD, se usa ese; si no (usuario nuevo), se manda a `/completar-registro`, que ahora ofrece las 3 opciones (Alumno/Profesor/Academia) | `app/auth/callback/route.ts:44-68`, `app/completar-registro/CompletarRegistroClient.tsx:15-17,38-40` |
| Login por correo (`/login`) | **No se conoce en el submit** — se resuelve después, con una consulta a `profiles.role` | `lib/auth/redirectByRole.ts:24-28` |
| Login por Google (`/login`) | Igual que arriba, pero la consulta ocurre **server-side**, en un Route Handler | `app/auth/callback/route.ts:36-41` |

**Nota v4:** `UneteClient.tsx` ya no tiene su propio `signUp()` — el `role` hardcodeado que citaba v1-v3 (`app/unete/UneteClient.tsx:76`) vive ahora en el hook compartido `lib/auth/useSignupForm.ts`, factorizado para que `/academias` lo reuse tal cual. Referencia corregida arriba.

**Conclusión clave (sin cambios):** para los flujos de *registro* directo (filas 1-3), el rol siempre se conoce en el momento del intento (`auth_attempt`) — o está hardcodeado por la página, o viaja explícito en la URL. El problema real está exclusivamente en **login** (filas 7-8) y en el caso borde de Google-sin-rol-preseleccionado (fila 6): ahí el rol se resuelve *después* de autenticar, vía una consulta a `profiles`, nunca antes.

### 9.3 El código exacto de `redirectByRole` — y el gap que tiene

```ts
// lib/auth/redirectByRole.ts
export async function redirectByRole(
  supabase: SupabaseClient,
  options: {
    onSuccess: (path: string, notice?: string | null) => void;
    onError: (msg: string) => void;
    refresh?: () => void;
    expectedRole?: string | null;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { options.onError('Sesión no encontrada. Intenta de nuevo.'); return; }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  options.refresh?.();
  const dest = profile?.role === 'alumno' ? '/clases' : profile ? '/dashboard' : '/clases';
  const notice = options.expectedRole !== undefined ? roleMismatchNotice(options.expectedRole, profile?.role ?? null) : null;
  options.onSuccess(dest, notice);   // ⚠️ solo pasa el PATH derivado, nunca el role real
}
```

**Gap encontrado:** `onSuccess` recibe `dest` (un path: `/clases` o `/dashboard`), no el `role` en sí. Como profesor **y** academia ambos van a `/dashboard`, cualquier tracking que se apoye en `dest` para inferir el rol **no puede distinguir profesor de academia** — se ven idénticos desde el callback. Esta función es compartida por 3 flujos distintos (`app/login/page.tsx:112`, `app/confirmar-email/page.tsx:90`, `app/reset-password/page.tsx:74`), así que el fix hay que hacerlo una sola vez, ahí, y beneficia a los 3 llamadores.

**Fix propuesto (cambio de código, no solo de GTM):**
```ts
onSuccess: (path: string, notice?: string | null, role?: string | null) => void;
// ...
options.onSuccess(dest, notice, profile?.role ?? null);
```
Cada llamador decide qué hacer con el `role` real recibido — `app/login/page.tsx` lo usaría para disparar `login_success`; `confirmar-email` y `reset-password` no lo necesitan para tracking (no son login) y simplemente lo ignoran.

### 9.4 El problema arquitectónico: el callback de Google es server-side, sin `dataLayer`

`app/auth/callback/route.ts` es un **Route Handler** (`export async function GET`), no un componente cliente — corre en el servidor, no existe `window` ni `dataLayer` ahí. Resuelve el rol con la misma lógica (`profiles.select('role')`, línea 37-41) pero el único output posible es un `NextResponse.redirect(...)` HTTP. **Es imposible empujar un evento al dataLayer dentro de ese archivo.**

Esto significa que para el login por Google, el evento solo puede dispararse **después**, en la página cliente donde aterriza el redirect (`/clases` para alumno, `/dashboard` para profesor/academia) — nunca en el callback mismo.

**La buena noticia:** Kynea ya resolvió este exacto problema para `sign_up`, con el patrón `?new=1` (un query param que el server agrega a la URL de destino, leído una sola vez por una página cliente, que dispara el evento y de ahí en adelante el param deja de estar presente). La estrategia natural es **reusar el mismo patrón para login**, no inventar uno nuevo:

1. En `auth/callback/route.ts`, cuando el destino es un login exitoso (rama de la línea 71-78, "Existing user with a role"), agregar un flag a la URL de destino: `${dest}?login=1` (o anexar si `dest` ya trae `redirectTarget`).
2. La página que recibe ese aterrizaje (`/clases`, o el layout de `/dashboard`) — que **ya conoce el rol del usuario** vía su propio fetch de perfil server-side, porque ambas rutas hacen esa verificación para RLS/auth — lee `searchParams.get('login') === '1'` una sola vez en un `useEffect`, dispara `login_success` con el rol ya disponible, y limpia el param con `router.replace()` para que no se re-dispare en un refresh o al volver atrás con el botón del navegador.
3. Para login por correo (`app/login/page.tsx:112-116`, mismo componente, sin salir de la SPA), es más simple: una vez aplicado el fix de 9.3, el `role` ya llega directo al `onSuccess` callback — se dispara ahí mismo, sin necesidad de query param ni segunda carga de página.

No hace falta meter el `role` en la URL en ningún caso — la página de destino ya lo puede resolver por su cuenta; el query param es solo un flag de "esto fue un login recién completado, dispara el evento una vez".

### 9.5 El doble-conteo de `auth_cta_click` en el camino profesor (hallazgo nuevo)

Confirmado en `UneteClient.tsx` y `BeneficiosClient.tsx`: existen **dos caminos de entrada** al registro de profesor que ambos terminan en `/unete`, pero uno pasa por dos clics rastreados y el otro por uno:

- **Header** (`header_desktop_profesor` / `header_mobile_profesor`) → aterriza en `/unete/beneficios` (landing) → clic en `beneficios_hero` o `beneficios_cta_final` → recién ahí llega a `/unete`. **2 eventos `auth_cta_click` por persona.**
- **Home** (`home_teacher_cta`) → salta directo a `/unete`, sin pasar por la landing. **1 evento.**

Si se suma `COUNT(auth_cta_click WHERE auth_action='registro')` como proxy de "cuánta gente mostró intención de ser profesor", el camino Header queda sobre-contado 2x respecto al camino Home. Para un funnel correcto en GA4: o se agrupa `header_*` + `beneficios_*` como un solo paso lógico de entrada, o se usa conteo de **usuarios únicos** en vez de conteo de eventos en el Exploration (GA4 lo soporta, pero no es el default — hay que elegirlo explícitamente al armar el reporte).

### 9.6 Qué se mide hoy del OTP, y qué no

Confirmado en `app/confirmar-email/page.tsx:74`: `trackAuthAttempt({ action: 'registro', method: 'email_otp' })` se dispara **en el submit** (auto-envío al completar los 6 dígitos, línea 34-39), **antes de saber si el código es válido** — mismo patrón que el resto de `auth_attempt` (mide intento, no resultado). Si el código es incorrecto, el evento se disparó igual.

El "éxito" del OTP no tiene evento propio hoy — se infiere implícitamente porque `verifyOtp` solo deja avanzar a `/onboarding?new=1` si fue correcto (la función corta antes en la línea 83-87 si hay error), y ese avance es justo lo que dispara `sign_up`. Funciona para saber "¿se completó el registro?", pero **no permite distinguir** a alguien que falló el código una vez y lo reintentó bien, de alguien que abandonó después de varios intentos fallidos — ambos casos generan múltiples `auth_attempt(email_otp)` sin forma de diferenciarlos. No es indispensable, pero es una brecha real si en algún momento importa medir fricción específica de OTP (ver 9.8, candidato `otp_verify_failed`).

### 9.7 `login_success` (implementado 2026-08-06)

- **Qué mide:** el cierre real del login — cuando el rol ya se resolvió y la persona efectivamente aterrizó en su área. Antes de esto solo se medía el *intento* (`auth_attempt` con `auth_action: 'login'`), nunca si realmente se resolvió con éxito ni con qué rol.
- **Params:** `role` (`alumno`/`profesor`/`academia`), `method` (`email`/`google`).
- **Login por correo:** `trackLoginSuccess`, `app/login/page.tsx`, dentro del `onSuccess` de `redirectByRole` — usa el `role` real recibido gracias al fix de 9.3. Se guarda con `if (role) trackLoginSuccess(...)`: si el perfil no resolvió rol (caso borde de trigger roto, ver 9.3), no se dispara el evento en vez de mandar `role: null` a GA4.
- **Login por Google — arquitectura distinta a la propuesta original, decidida con el usuario:** el checklist original (punto 5, abajo) asumía que la página de aterrizaje era siempre `/clases` o `/dashboard`. Al implementar se encontró que **no es así** — `app/auth/callback/route.ts`'s `dest` puede ser un `redirectTarget` arbitrario (ej. la clase que la persona quería contactar cuando la gatearon a loguearse), así que no hay una sola "página de llegada" fija donde enganchar el evento. Se presentaron 3 opciones y el usuario eligió: un **listener global montado una sola vez en `app/layout.tsx`** (`components/LoginSuccessListener.tsx`, mismo patrón que `ImageProviderHealthCheck`, ya existente ahí). Lee `?login=1` vía `useSearchParams` en cualquier página donde aterrice, resuelve el rol con una consulta a `profiles` (mismo patrón confiable que `redirectByRole`), dispara `trackLoginSuccess({ role, method: 'google' })`, y limpia el parámetro con `router.replace()`.
- **Por qué importa:** permite separar "profesor que vuelve a loguearse" de "profesor completando su primer registro" — antes ambos solo generaban un `auth_attempt`, indistinguibles entre sí.
- **Nota menor, no introducida por este cambio:** `app/auth/callback/route.ts` ya concatenaba `?notice=...` a `dest` sin chequear si `dest` (cuando viene de un `redirectTarget`) ya trae su propio `?query` — un `redirect` con query propio produciría una URL con doble `?`. Ahora `login=1` se agrega con el mismo patrón (vía `URLSearchParams`, pero sobre el mismo `dest` potencialmente ya-con-query). Es un edge case preexistente, no algo que este cambio rompió ni arregló — si algún `redirect` real llega a traer query string, vale la pena revisarlo aparte.

### 9.8 `otp_verify_failed` (implementado 2026-08-06)

- **Qué mide:** cada vez que `verifyOtp` devuelve error, `app/confirmar-email/page.tsx`'s `handleVerify()`, antes del `return` que corta el flujo.
- **Params:** ninguno — se implementó la versión mínima de la spec (sin el `attempt_number` opcional que el informe mencionaba), para no agregar tracking de intentos que nadie pidió explícitamente. Si en algún momento se quiere ese nivel de detalle, es un cambio pequeño aparte (contador en un `useRef`, no en estado).
- **Prioridad:** baja, tal como estaba planteado — diagnóstico fino de una fricción específica, no bloquea ningún mapeo de embudo de negocio.

### 9.9 Checklist técnico — estado final (las 4 tandas completas)

1. ✅ `lib/auth/redirectByRole.ts` — `onSuccess` ahora pasa también `profile?.role ?? null`. Confirmado explícitamente: `confirmar-email` y `reset-password` no usan el nuevo argumento (ninguno dispara un evento de login), solo `login` lo consume.
2. ✅ `lib/analytics.ts` — `trackLoginSuccess({ role, method })`.
3. ✅ `app/login/page.tsx` — dispara `trackLoginSuccess` en el `onSuccess` de `redirectByRole`, antes de `router.push(...)`.
4. ✅ `app/auth/callback/route.ts` — la rama "Existing user with a role" agrega `?login=1` (vía `URLSearchParams`) a la URL de destino.
5. ⚠️ **Cambiado respecto al plan original** — en vez de una página/layout de aterrizaje específica, se implementó `components/LoginSuccessListener.tsx`, montado globalmente en `app/layout.tsx`. Ver el hallazgo en 9.7 arriba.
6. ✅ `app/confirmar-email/page.tsx` — `trackOtpVerifyFailed()` en la rama de error de `verifyOtp`.

### 9.10 `onboarding_step_complete` puede re-dispararse para el mismo paso — verificado tras implementar

Ya implementado (ver checklist de implementación aparte) — este es un matiz de interpretación encontrado al cablearlo, no un bug: **el conteo de `onboarding_step_complete` mide *veces que se superó un paso*, no *personas que llegaron a ese paso por primera vez*.** Dos casos concretos donde una misma persona genera más de un evento para el mismo `step_name`:

1. **Abandono y regreso entre sesiones.** `app/onboarding/page.tsx` se re-usa para dos casos: un signup fresco, y cuando `proxy.ts` rebota de vuelta acá a alguien con onboarding incompleto (el propio código ya lo documenta en la línea 79-82, a propósito del guard de `new=1` para `sign_up`). Si un profesor llena el paso 0 ("Datos públicos"), cierra la pestaña, y vuelve días después, al re-pasar por "Continuar" el evento se dispara de nuevo para ese mismo paso — no hay ninguna marca de que ya lo había completado en una sesión anterior.
2. **Navegación hacia atrás dentro de la misma sesión.** El botón "Atrás" (`back()`, `app/onboarding/page.tsx:172`) no revierte nada del tracking — si el usuario retrocede a un paso ya completado y vuelve a darle "Continuar", `handleNext()` corre de nuevo íntegro y el evento se dispara otra vez para ese `step_name`.

**Implicancia para el análisis en GA4:** si alguien interpreta `COUNT(onboarding_step_complete WHERE step_name='Datos públicos')` como "personas que llegaron al paso Datos públicos", va a sobre-contar a quien abandona y regresa, o a quien retrocede y avanza de nuevo. Para una lectura de funnel correcta conviene usar **usuarios únicos** (no conteo de eventos) por paso en el Exploration de GA4 — mismo matiz ya señalado en 9.5 para el doble-conteo de `auth_cta_click` en el camino profesor. No se propone ningún cambio de código para "deduplicar" esto — es el comportamiento esperado de un step-tracker y agregar de-dupe (ej. guardar en `sessionStorage` qué pasos ya se reportaron) sería complejidad no pedida para un problema que se resuelve del lado del reporte, no del evento.

### 9.11 Preguntas abiertas para decidir antes de implementar

- ¿`login_success` se debe marcar como conversión en GA4 (Admin → Eventos)? Depende de si el negocio quiere medir "logins recurrentes" como señal de retención, o solo le importan las conversiones de *primera vez* (`sign_up`, `class_created`, `generate_lead`).
- ¿Vale la pena `otp_verify_failed` ahora, o se pospone hasta tener más volumen de datos que justifique ese nivel de detalle?
- ¿El doble-conteo de `auth_cta_click` en el camino profesor (9.5) se resuelve a nivel de reporte en GA4 (usuarios únicos) o conviene además unificar el producto para que `home_teacher_cta` también pase por `/unete/beneficios` (decisión de producto, no de tracking, ya señalada como pendiente en la sección 3.3)?
