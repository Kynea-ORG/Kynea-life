# Hotfix de emergencia

Desde que `develop` y `main` tienen `enforce_admins: true`, **nadie puede bypassear branch protection en silencio** — ni siquiera un admin/Owner de la organización. Si producción está caída y necesitás mergear sin esperar review o sin que pase el CI, tenés que desactivar la protección explícitamente. Queda registrado en el audit log del repo (quién, cuándo, qué cambió).

No hay atajo más rápido que este. Es intencional.

## Procedimiento

### 1. Desactivar `enforce_admins` en la rama afectada

```bash
gh api repos/Kynea-ORG/Kynea-life/branches/main/protection/enforce_admins --method DELETE
```

(Cambiá `main` por `develop` si el hotfix es ahí.)

Esto reabre el bypass **solo para admins/Owners**. El resto de las reglas (reviews de CODEOWNERS, CI obligatorio, no force-push, no delete) siguen activas para todos los demás.

### 2. Hacer el fix y mergear

Con `enforce_admins` desactivado, un admin puede mergear un PR sin esperar aprobación ni CI, o pushear directo si hace falta.

### 3. Reactivar la protección inmediatamente

```bash
gh api repos/Kynea-ORG/Kynea-life/branches/main/protection/enforce_admins --method POST
```

**Este paso es el que más se olvida.** Si no lo hacés, el repo queda desprotegido indefinidamente sin que nadie lo note. Verificá que quedó activo:

```bash
gh api repos/Kynea-ORG/Kynea-life/branches/main/protection/enforce_admins --jq .enabled
# debe devolver: true
```

### 4. Cerrar el círculo

- Si el hotfix se hizo directo en `main`, traelo de vuelta a `develop` (cherry-pick o merge) para que las ramas no queden divergentes.
- Documentá qué pasó y por qué se saltó el proceso normal — en un comentario del commit, un PR retroactivo, o un mensaje al equipo. El audit log muestra el *qué* y el *quién*, pero no el *por qué*.

## Cuándo NO usar esto

Para cambios que no son una emergencia real (prod caída, bug crítico afectando usuarios), usá el flujo normal: rama → PR → review → CI → merge. Ver [DEPLOY.md](DEPLOY.md) para el flujo de despliegue y migraciones, y [CONTEXT.md](CONTEXT.md) para el contexto general del proyecto.
