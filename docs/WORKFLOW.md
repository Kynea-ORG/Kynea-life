# Flujo de trabajo del repo

Cómo se mergea código en Kynea desde ahora. Aplica a los dos, sin excepciones — ni el rol de admin te salta estas reglas.

## 1. Ramas y Entornos (Vercel Pro)

El flujo separa **experimentación/pruebas** de **código listo para producción** para que `develop` nunca sea un cuello de botella ni obligue a hacer hotfixes:

| Rama | Entorno Vercel Pro | Base de datos | Regla de uso |
| :--- | :--- | :--- | :--- |
| `main` | **Production** (`www.kynea.dance`) | Supabase Producción | Solo recibe PRs desde `develop` cuando todo lo que contiene va a producción. |
| `develop` | **Staging** (`staging.kynea.dance`) | `kynea-dev` | **Release Candidate siempre limpio.** Solo entra código (y migraciones) ya aprobado para el próximo release. |
| `sandbox` | **Sandbox** (`lab.kynea.dance`) | `kynea-dev` | Rama desechable/reseteable para probar **múltiples features WIP juntas** o hacer demos. **Nunca** se mergea hacia `develop` ni `main`. |
| `epic/*` | **Preview** (URL estable de rama) | `kynea-dev` | Rama de integración para features grandes o multi-PR (ej. `epic/bookings`). Recibe sub-PRs con CI automático hasta estar lista para entrar a `develop`. |
| `feature/*`, `fix/*`, `chore/*` | **Preview** (por PR) | `kynea-dev` | Ramas cortas para cambios puntuales. Salen de `develop` (o de `epic/*`) y se borran al mergear. |
| `user/*` | **Preview** (por rama/PR) | `kynea-dev` | Rama personal continua por integrante (ej. `user/DavidVilcaO`). Nunca se elimina tras mergear su PR. |

- Push directo a `develop`/`main` está bloqueado a nivel de GitHub (Branch Protection) y respaldado en local mediante `.githooks/pre-push` (instalado automáticamente vía `npm run prepare`) — ni siquiera un admin puede saltárselo sin pasar por el procedimiento de [HOTFIX.md](HOTFIX.md).

### Cómo evitar bloquear `develop` con features grandes

1. **Si la feature aún no puede pasar a producción (o trae migraciones complejas):**
   - Trabájala en `epic/<nombre>` (ej. `epic/bookings`) o en tu rama `user/*`. El CI (`lint-and-typecheck`) corre también en PRs hacia `epic/**`.
   - Si necesitas probar varias features WIP juntas en un dominio fijo (por OAuth o callbacks), fusiónalas temporalmente en `sandbox` (`lab.kynea.dance`). Cuando termines, resetea `sandbox` al estado de `develop` (`git push --force-with-lease origin develop:sandbox`).
   - **Migraciones en `epic/*`:** asigna o renumera el prefijo secuencial definitivo en `supabase/migrations/` recién cuando la épica vaya a abrir su PR final hacia `develop`, para no colisionar con fixes que entraron antes.
2. **Si la feature se integra de forma incremental (Trunk-Based):**
   - Protégela con una variable de entorno por ambiente en Vercel Pro (ej. `NEXT_PUBLIC_FEATURE_<X>=true` en `Preview`, `Sandbox` y `Staging`, y `false` en `Production`), asegurando que cualquier migración asociada sea aditiva y compatible hacia atrás.

### Fixes urgentes en producción (sin hotfix)

Como `develop` (`Staging`) solo contiene cambios listos para salir:
1. Crea `fix/<nombre>` desde `develop`.
2. Abre PR a `develop`, valida CI y prueba en `staging.kynea.dance`.
3. Abre PR `develop` → `main` el mismo día. No arrastrarás features a medias ni necesitarás desactivar `enforce_admins`.
4. Si un despliegue recién salido en `main` falla mientras preparas el fix, usa **Instant Rollback** en Vercel Pro para revertir el deployment en 1 clic sin tocar Git.

## 2. Pull Requests

Cada cambio entra por PR. Un PR necesita:

1. **1 aprobación**, como mínimo. Definido por [`CODEOWNERS`](../.github/CODEOWNERS):
   - Cambios en `lib/`, `supabase/`, o `proxy.ts` (datos, schema, auth) → **requieren aprobación de @joseniquen08 específicamente**, sin importar quién abrió el PR.
   - Cualquier otro cambio (`app/`, `components/`, etc.) → puede aprobarlo cualquiera de los dos.
2. **CI en verde**: el check `lint-and-typecheck` (lint + `tsc --noEmit` + `npm run test`) corre automático en cada PR y tiene que pasar con check verde ✅. Si falla, hay un error real de código — no se mergea hasta arreglarlo.
3. En `main` además se exige que pase el build/preview de **Vercel**.

**Importante**: GitHub nunca deja que el autor de un PR apruebe su propio PR — es una regla de la plataforma, no de este repo. Si sos el único disponible para revisar tu propio cambio, pedile al otro que lo revise. No hay atajo salvo la excepción de emergencia en [HOTFIX.md](HOTFIX.md).

**Cuenta de autoría (`joseniquen08-pr`)**: como `lib/`, `supabase/` y `proxy.ts` requieren aprobación específica de `@joseniquen08`, y GitHub no deja auto-aprobar, los PRs que tocan esas rutas se abren con la cuenta bot `joseniquen08-pr` (no con `joseniquen08`) para que la aprobación humana sea posible. El token de esa cuenta vive en `~/.kynea-bot-token` fuera del repo; se usa así, sin tocar la sesión de `gh` por defecto:

```bash
GH_TOKEN=$(cat ~/.kynea-bot-token) gh pr create --repo Kynea-ORG/Kynea-life ...
```

No uses `gh auth login`/`gh auth switch` para esto — el token del bot no tiene el scope `read:org` que esos comandos exigen y falla.

## 3. Antes de abrir un PR

- Corré `npm run lint` y `npx tsc --noEmit` localmente — así no descubrís el error recién en el CI.
- Probá el cambio en el preview de Vercel que se genera automático por PR antes de pedir review (no hay test suite automatizado, el preview + tu prueba manual ES el gate de calidad).
- Completá el PR template (`## Qué cambia` / `## Cómo se probó`) con contenido real, no genérico.

## 4. Migraciones de base de datos

Si tu cambio toca `supabase/migrations/`, además del review normal, el push automático a Supabase pasa por su propio pipeline — ver [DEPLOY.md](DEPLOY.md), sección B. A producción nunca se aplica nada sin aprobación explícita en el Environment `supabase-production`.

## 5. Si algo se rompe en producción

Ver [HOTFIX.md](HOTFIX.md) — es el único camino para saltarse el proceso normal, y queda registrado.

## Referencias

- [CONTEXT.md](CONTEXT.md) — arquitectura y schema del proyecto
- [DEPLOY.md](DEPLOY.md) — deploy y migraciones
- [HOTFIX.md](HOTFIX.md) — bypass de emergencia
- [TASKS.md](TASKS.md) — trabajo pendiente
- [BUGS.md](BUGS.md) — bugs conocidos
