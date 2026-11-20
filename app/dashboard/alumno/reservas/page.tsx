import { redirect } from 'next/navigation';

/** Compatibilidad: "Mis reservas" vive ahora en /dashboard/mis-reservas para cualquier rol. */
export default function LegacyAlumnoReservasRedirectPage() {
  redirect('/dashboard/mis-reservas');
}
