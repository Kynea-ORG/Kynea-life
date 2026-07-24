// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldError = { field: string; message: string };
export type ValidationResult = { ok: boolean; errors: FieldError[] };

export interface OnboardingForm {
  publicName: string;
  nationality: string;
  instagram: string;
  styles: string[];
  // Other onboarding form fields (bio, representante, tiktok, etc.) are
  // tolerated but unused by this validator.
  [key: string]: unknown;
}

// ─── Validator ──────────────────────────────────────────────────────────────

// Pure, side-effect-free gate for the onboarding wizard's per-step
// "Continuar"/"Guardar y entrar" advance. No DOM/React dependency so it can
// be unit-tested directly and reused from both handleNext and handleFinish.
export function validateStep(
  step: number,
  form: OnboardingForm,
  contact: { waNumber: string }
): ValidationResult {
  const errors: FieldError[] = [];

  switch (step) {
    case 0:
      if (!form.publicName || !form.publicName.trim()) {
        errors.push({ field: 'publicName', message: 'El nombre público es obligatorio.' });
      }
      if (!form.nationality || !form.nationality.trim()) {
        errors.push({ field: 'nationality', message: 'La nacionalidad es obligatoria.' });
      }
      break;

    case 1:
      // Ported verbatim from the previous inline check in handleNext.
      if (!contact.waNumber && !form.instagram) {
        errors.push({
          field: 'whatsapp',
          message: 'Ingresa al menos tu WhatsApp o Instagram para que los alumnos puedan contactarte.',
        });
      }
      break;

    case 2:
      if (form.styles.length === 0) {
        errors.push({ field: 'styles', message: 'Selecciona al menos un estilo que enseñas.' });
      }
      break;

    default:
      break;
  }

  return { ok: errors.length === 0, errors };
}
