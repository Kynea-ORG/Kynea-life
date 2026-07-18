# Flujo de trabajo del repo

Cómo se mergea código en Kynea desde ahora. Aplica a los dos, sin excepciones — ni el rol de admin te salta estas reglas.

## 1. Ramas

- `main` → producción. `develop` → integración.
- Todo cambio va en una rama propia (`feature/lo-que-sea`, `fix/lo-que-sea`), nunca directo a `develop` o `main`.
- Cada miembro del equipo puede tener una rama personal con su nombre de usuario de GitHub usando el prefijo `user/` (ej. `user/DavidVilcaO`) para subir cambios propios en curso.
- Push directo a `develop`/`main` está bloqueado a nivel de GitHub — ni siquiera un admin puede saltárselo sin pasar por el procedimiento de [HOTFIX.md](HOTFIX.md).

## 2. Pull Requests

Cada cambio entra por PR. Un PR necesita:

1. **1 aprobación**, como mínimo. Definido por [`CODEOWNERS`](../.github/CODEOWNERS):
   - Cambios en `lib/`, `supabase/`, o `proxy.ts` (datos, schema, auth) → **requieren aprobación de @joseniquen08 específicamente**, sin importar quién abrió el PR.
   - Cualquier otro cambio (`app/`, `components/`, etc.) → puede aprobarlo cualquiera de los dos.
2. **CI en verde**: el check `lint-and-typecheck` (lint + `tsc --noEmit`) corre automático en cada PR y tiene que pasar. Si falla, hay un error real de código — no se mergea hasta arreglarlo.
3. En `main` además se exige que pase el build/preview de **Vercel**.

**Importante**: GitHub nunca deja que el autor de un PR apruebe su propio PR — es una regla de la plataforma, no de este repo. Si sos el único disponible para revisar tu propio cambio, pedile al otro que lo revise. No hay atajo salvo la excepción de emergencia en [HOTFIX.md](HOTFIX.md).

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
