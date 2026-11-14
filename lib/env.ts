/**
 * Determina si el despliegue actual corresponde al entorno real de Producción.
 *
 * En Vercel Pro los Custom Environments (como `staging` o `sandbox`) y los
 * Previews tienen `VERCEL_ENV === 'preview'` y un `VERCEL_TARGET_ENV` distinto
 * de `'production'`. Esta verificación evita exponer SEO o comportamiento de
 * producción en dominios como `staging.kynea.dance` o `lab.kynea.dance`.
 */
export function isProductionDeployment(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (env.NEXT_PUBLIC_APP_ENV && env.NEXT_PUBLIC_APP_ENV !== 'production') {
    return false;
  }

  if (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'production') {
    return false;
  }

  if (env.VERCEL_ENV) {
    return env.VERCEL_ENV === 'production';
  }

  return env.NEXT_PUBLIC_APP_ENV === 'production';
}
