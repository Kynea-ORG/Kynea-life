// Mapea errores crudos de la Admin API de Supabase a mensajes en español.
// Espejo de getAuthErrorMessage (app/registro/page.tsx) y
// getPasswordErrorMessage (ConfiguracionClient.tsx).
//
// Vive en su propio archivo (y no dentro de lib/admin/actions.ts como
// función privada del módulo) porque actions.ts es 'use server': Next.js 16
// exige que TODO export de un archivo 'use server' sea una función async
// (Server Actions must be async functions) — una función sync exportada
// rompe el build de Turbopack. Se mantiene exportada aquí para poder
// testearla de forma aislada sin pasar por los mocks de Supabase.
export function getCreateUserErrorMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('already exists') ||
    m.includes('duplicate')
  )
    return 'Ya existe una cuenta con este correo.';
  if (m.includes('password'))
    return 'La contraseña no cumple los requisitos mínimos (8 caracteres).';
  if (m.includes('email') && (m.includes('invalid') || m.includes('format')))
    return 'El correo electrónico no es válido.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera unos minutos.';
  return 'No se pudo crear la cuenta. Intenta de nuevo.';
}
