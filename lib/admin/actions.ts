'use server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchIsAdmin } from '@/lib/admin/queries';
import { getCreateUserErrorMessage } from '@/lib/admin/errorMessages';

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: 'profesor';
};

export type CreateUserResult =
  | { ok: true; userId: string; name: string; email: string; password: string }
  | { ok: false; error: string };

const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUserAsAdmin(input: CreateUserInput): Promise<CreateUserResult> {
  // Guard 1: sesión activa. Idéntico al idioma de deleteAccount/updateProfile/createClass.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Guard 2: solo un admin puede llegar aquí. app/dashboard/admin/layout.tsx
  // ya redirige en la UI, pero un Server Action es un endpoint POST
  // direccionable por cualquiera que conozca su id — este chequeo es lo que
  // realmente lo protege.
  if (!(await fetchIsAdmin())) throw new Error('No autorizado');

  // Guard 3: validación server-side. El botón deshabilitado de Academia en el
  // formulario es UX, no enforcement — esta es la regla real.
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_SHAPE_RE.test(email)) return { ok: false, error: 'El correo electrónico no es válido.' };

  if (input.password.length < 8)
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };

  if (input.role !== 'profesor')
    return { ok: false, error: 'Ese tipo de cuenta no está disponible por ahora.' };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // Decisión 1: cuenta usable de inmediato, sin confirmar correo.
    user_metadata: { name, role: input.role, created_by: user.id },
  });

  if (error || !data.user) {
    return { ok: false, error: getCreateUserErrorMessage(error?.message ?? '') };
  }

  // No revalidatePath — nada en la app todavía renderiza un listado de usuarios.
  // No INSERT manual en profiles — handle_new_user ya crea la fila completa
  // (name, role, slug y ahora created_by).
  return { ok: true, userId: data.user.id, name, email, password: input.password };
}
