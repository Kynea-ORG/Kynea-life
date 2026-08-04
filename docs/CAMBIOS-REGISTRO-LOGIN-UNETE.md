# Análisis del cambio: separación de registro alumno/profesor

Este documento resume, para revisión de José, todo lo que cambió en esta rama (`user/DavidVilcaO`, aún sin PR abierto) alrededor de login/registro. Es una exploración propia de David todavía no del todo afinada — se documenta ahora para que José sepa qué esperar y qué debe revisar/aprobar cuando se abra el PR.

## 1. Qué cambió (resumen funcional)

Antes, `/registro` era un formulario único con selector de rol (alumno/profesor/academia) y el Header tenía un botón genérico "Publicar clase" que llevaba ahí. Se detectó que mezclar ambas audiencias en una sola pantalla confundía al usuario.

Ahora:

- **`/login`** — sin cambios de audiencia, pero rediseñado visualmente (panel de marca a la izquierda/arriba con ilustración, mismo patrón que `/registro` y `/unete`). Sigue siendo el punto de entrada universal.
- **`/registro`** — ahora es **solo alumno**. Ya no tiene selector de rol; el `role` se manda fijo como `'alumno'` en el `signUp`. Mismo rediseño visual.
- **`/unete`** (página nueva) — landing dedicada exclusivamente al registro de **profesor**, con su propia propuesta de valor (bullets, badge social-proof "31+ profesores ya publican"). El `role` se manda fijo como `'profesor'`.
- **Header** — el botón "Publicar clase" desaparece. Se reemplaza por dos caminos separados: "Iniciar sesión" (universal) y "Únete como profesor" (lleva a `/unete`).

**Academia queda sin vía pública de registro** por ahora — es una decisión explícita, ya documentada como TODO pendiente en `CLAUDE.md` ("Campos exclusivos para academia en onboarding"). No es un olvido de este cambio, es scope diferido a propósito.

## 2. Impacto en base de datos: ninguno, pero hay un comportamiento a validar

**No hay ninguna migración nueva en esta rama para este cambio.** Revisé `supabase/migrations/` y el trigger `handle_new_user` (`20260705000070_07_auth_trigger.sql`): lee `raw_user_meta_data->>'role'` como texto libre, sin `CHECK`/enum que valide contra una lista fija — así que tanto `'alumno'` como `'profesor'` ya fluían sin problema antes de este cambio, y lo siguen haciendo ahora. **No se necesita ninguna migración para que esto funcione.**

Lo que sí cambia es **comportamiento**, no schema:

- Antes, un mismo formulario podía mandar `role: 'alumno' | 'profesor' | 'academia'` según lo que el usuario eligiera en el selector.
- Ahora, `/registro` siempre manda `'alumno'` y `/unete` siempre manda `'profesor'` — **no hay ningún flujo público que mande `'academia'`** (la única vía sigue siendo `/dashboard/admin/crear-usuario`, si ya existía antes).

José debería confirmar que ningún otro punto del sistema (RLS, dashboards, reportes) asume que `role` puede llegar por el registro público como `'academia'` — si algo dependía de eso, ahora quedaría huérfano hasta que se implemente el TODO de academia.

## 3. Por qué necesita la aprobación específica de José

Por regla del repo (`docs/WORKFLOW.md`), cambios en `lib/`, `supabase/`, o **`proxy.ts`** requieren aprobación de `@joseniquen08` sin importar quién abra el PR. Este cambio toca `proxy.ts`:

```diff
- '/onboarding', '/auth', '/login', '/registro',
+ '/onboarding', '/auth', '/login', '/registro', '/unete',
```

Solo agrega `/unete` a la lista `ONBOARDING_FREE` (rutas accesibles sin haber completado onboarding) — mismo patrón que las rutas de auth existentes, sin tocar lógica de sesión/redirect. Ningún archivo de `lib/` ni `supabase/` está tocado en esta rama ahora mismo.

## 4. Archivos modificados (vista completa)

| Archivo | Qué cambia |
|---|---|
| `proxy.ts` | Agrega `/unete` a `ONBOARDING_FREE` (requiere aprobación de José, ver §3) |
| `components/Header.tsx` | Botón "Publicar clase" → "Iniciar sesión" (blanco) + "Únete como profesor" (negro, va a `/unete`); `font-sans` agregado a todos los textos/acciones del Header |
| `app/login/page.tsx` | Rediseño visual (panel ilustración + copy), sin cambio de audiencia |
| `app/registro/page.tsx` | Rediseño visual + quita selector de rol, ahora `role: 'alumno'` fijo |
| `app/unete/` (nuevo) | Página nueva: landing + formulario de registro de profesor, `role: 'profesor'` fijo |
| `app/HomeClient.tsx` | CTA "Publicar mi primera clase →" ahora apunta a `/unete` en vez de `/registro` |
| `app/clases/[id]/ClaseDetailClient.tsx` | El gate de login al guardar una clase sin sesión ahora también dispara `auth_cta_click` (`save_class_gate`) |
| `app/sitemap.ts` | Agrega `/unete` al sitemap |
| `components/GoogleIcon.tsx` (nuevo) | Logo real de Google (reemplaza el ícono genérico `Globe` en los botones "Continuar con Google") |
| `public/*.png` (4 imágenes nuevas), `public/dancer-icon.svg` (eliminado) | Ilustraciones de marca para los 3 paneles (login/registro/únete), mobile y desktop |

## 5. Impacto en GTM / analíticas — sí requiere trabajo de configuración

Este es el punto que más "prepararse" necesita, porque **el código ya dispara los eventos nuevos en producción, pero GTM todavía no está configurado para recibirlos** (esto es preexistente al día de hoy, no algo que este cambio empeore — pero el cambio sí agrega/renombra varios `cta_location`).

El detalle completo ya está documentado en [`docs/informe-marcaciones-gtm.md`](./informe-marcaciones-gtm.md). Resumen de lo que cambió específicamente por esta restructuración:

- **Nuevos `cta_location`:** `header_desktop_profesor`, `header_mobile_profesor` (antes eran `header_desktop`/`header_mobile` genéricos), `unete_page`, `save_class_gate`.
- **Ruta nueva a trackear en GA4 como página real:** `/unete`.
- Los 4 eventos base (`sign_up`, `generate_lead`, `auth_cta_click`, `auth_attempt`) no cambiaron de forma/parámetros — solo cambiaron los *valores* que puede tomar `cta_location`.

**Acción pendiente en GTM** (no es código, es configuración manual en el contenedor `GTM-KVGV4DR9`): si ya existe un Trigger/Tag para `auth_cta_click`, no hace falta tocar nada — `cta_location` es solo un valor de parámetro, no un evento nuevo. Si en el dashboard de GA4 hay algún filtro/reporte que compara por el valor exacto `header_desktop` o `header_mobile`, esos reportes van a dejar de recibir datos con esos nombres exactos una vez que esto se mergee, y hay que actualizarlos para usar `header_desktop_profesor` / `header_mobile_profesor`.

## 6. Checklist para José

- [ ] Confirmar que nada depende de que el registro público pueda mandar `role: 'academia'` (§2).
- [ ] Revisar y aprobar el cambio de `proxy.ts` (único archivo gateado por CODEOWNERS en este diff).
- [ ] Avisar si algún reporte/dashboard de GA4 filtra por `cta_location = header_desktop` o `header_mobile` para actualizarlo a los nuevos valores (§5).
- [ ] Nada de esto requiere `npm run db:push` ni tocar `kynea-dev`/producción — no hay migraciones en esta rama.

## 7. Estado del cambio

Todo lo de este documento sigue **sin commitear, solo en el working tree de la rama `user/DavidVilcaO`** — David lo está afinando visualmente todavía (ver `git status`). No hay PR abierto. Este análisis es para revisión temprana, antes de subir el PR.
