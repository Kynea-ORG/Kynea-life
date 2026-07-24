import type { ClassStatus, ClassType, Modality, PriceType } from '@/lib/types';
import { DAY_MAP } from './helpers';
import type { DbClassRow, DbClassSchedule } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

// Single source of truth for the fullDesc length cap — also drives the
// textarea live counter in CrearClaseForm.tsx.
export const MAX_FULL_DESC = 1000;

const REVERSE_DAY_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(DAY_MAP).map(([day, idx]) => [idx, day])
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldError = { field: string; message: string };
export type ValidationResult = { ok: boolean; errors: FieldError[] };

export interface ValidationSlot {
  days: string[];
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
}

export interface ClassValidationInput {
  status: ClassStatus | string;
  type: ClassType | string;
  title: string;
  style: string;
  level: string;
  fullDesc: string;
  recurrence: string;
  startDate: string;
  endDate: string;
  priceType: PriceType | string;
  price: string | number;
  offerPrice: string | number | null | undefined;
  modality: Modality | string;
  city: string;
  district: string;
  address: string;
  accessLink: string;
  coverImage: string;
  slots: ValidationSlot[];
}

// ─── Error envelope (shared by validation + publish gating + image upload) ────

export type PublishErrorPayload = {
  code: 'VALIDATION' | 'MISSING_CONTACT_CHANNEL' | 'INVALID_IMAGE';
  // NOTE: 'INVALID_IMAGE' is used by imageActions.ts's uploadClassImage
  message: string;
  errors?: FieldError[];
  missing?: ('whatsapp' | 'instagram')[];
};

export function publishError(payload: PublishErrorPayload): Error {
  return new Error(JSON.stringify(payload));
}

export function parsePublishError(err: unknown): PublishErrorPayload | null {
  if (!(err instanceof Error)) return null;
  try {
    const parsed = JSON.parse(err.message);
    if (parsed && typeof parsed === 'object' && typeof parsed.code === 'string' && typeof parsed.message === 'string') {
      return parsed as PublishErrorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

// Single source for the contact-gating deep link. Every call site (wizard
// banner, list-view toast) builds the identical href via this helper.
export function profileFixHref(missing: ('whatsapp' | 'instagram')[]): string {
  if (!missing.length) return '/dashboard/perfil#contacto';
  return `/dashboard/perfil?missing=${missing.join(',')}#contacto`;
}

// ─── Rule helpers ───────────────────────────────────────────────────────────

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getTime() < today.getTime();
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return NaN;
  return parseFloat(value);
}

// ─── Validators ───────────────────────────────────────────────────────────────

// Drafts stay permissive — no field rules are enforced. Provided for symmetry
// with validateForPublish and future tightening.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateForDraft(_input: ClassValidationInput): ValidationResult {
  return { ok: true, errors: [] };
}

export function validateForPublish(input: ClassValidationInput): ValidationResult {
  const errors: FieldError[] = [];

  if (!input.title || !input.title.trim()) {
    errors.push({ field: 'title', message: 'El título es obligatorio.' });
  }
  if (!input.style || !input.style.trim()) {
    errors.push({ field: 'style', message: 'El estilo de baile es obligatorio.' });
  }
  if (!input.level || !input.level.trim()) {
    errors.push({ field: 'level', message: 'El nivel es obligatorio.' });
  }
  if (!input.coverImage || !input.coverImage.trim()) {
    errors.push({ field: 'coverImage', message: 'La imagen de portada es obligatoria para publicar.' });
  }

  const slots = input.slots ?? [];
  if (slots.length === 0) {
    errors.push({ field: 'schedule', message: 'Debes agregar al menos un horario.' });
  } else {
    if (input.recurrence === 'mensual') {
      const totalDays = slots.reduce((sum, s) => sum + (s.days?.length ?? 0), 0);
      if (totalDays === 0) {
        errors.push({ field: 'schedule', message: 'Selecciona al menos un día de la semana.' });
      }
    }
    for (const slot of slots) {
      if (slot.startTime && slot.endTime && slot.endTime <= slot.startTime) {
        errors.push({ field: 'schedule', message: 'La hora de fin debe ser posterior a la hora de inicio.' });
      }
    }
  }

  if (!input.startDate) {
    errors.push({ field: 'startDate', message: 'La fecha de inicio es obligatoria.' });
  } else if (isPastDate(input.startDate)) {
    errors.push({ field: 'startDate', message: 'La fecha de inicio no puede estar en el pasado.' });
  }

  if (input.recurrence === 'mensual' && input.startDate && input.endDate) {
    if (input.endDate < input.startDate) {
      errors.push({ field: 'endDate', message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio.' });
    }
  }

  if (input.priceType !== 'Gratis') {
    const price = toNumber(input.price);
    if (!input.price || Number.isNaN(price) || price <= 0) {
      errors.push({ field: 'price', message: 'Ingresa un precio válido mayor a 0.' });
    } else if (input.offerPrice !== '' && input.offerPrice !== null && input.offerPrice !== undefined) {
      const offer = toNumber(input.offerPrice);
      if (!Number.isNaN(offer) && offer >= price) {
        errors.push({ field: 'price', message: 'El precio de oferta debe ser menor al precio base.' });
      }
    }
  }

  if (input.fullDesc && input.fullDesc.length > MAX_FULL_DESC) {
    errors.push({ field: 'fullDesc', message: `La descripción completa no puede superar ${MAX_FULL_DESC} caracteres.` });
  }

  if (input.modality === 'Presencial') {
    if (!input.address || !input.address.trim()) errors.push({ field: 'address', message: 'La dirección es obligatoria.' });
    if (!input.city || !input.city.trim()) errors.push({ field: 'city', message: 'La ciudad es obligatoria.' });
    if (!input.district || !input.district.trim()) errors.push({ field: 'district', message: 'El distrito es obligatorio.' });
  } else if (input.modality === 'Online') {
    if (!input.accessLink || !input.accessLink.trim()) errors.push({ field: 'accessLink', message: 'El enlace de acceso es obligatorio.' });
  }

  return { ok: errors.length === 0, errors };
}

// ─── Adapters (mechanical — zero business rules) ───────────────────────────────

export function formDataToValidationInput(fd: FormData): ClassValidationInput {
  const timeSlots = fd.get('timeSlots') as string | null;
  const slots: ValidationSlot[] = timeSlots ? JSON.parse(timeSlots) : [];

  return {
    status: (fd.get('status') as string) ?? 'draft',
    type: (fd.get('type') as string) ?? 'clase',
    title: (fd.get('title') as string) ?? '',
    style: (fd.get('style') as string) ?? '',
    level: (fd.get('level') as string) ?? '',
    fullDesc: (fd.get('fullDesc') as string) ?? '',
    recurrence: (fd.get('recurrence') as string) ?? '',
    startDate: (fd.get('startDate') as string) ?? '',
    endDate: (fd.get('endDate') as string) ?? '',
    priceType: (fd.get('priceType') as string) ?? 'Gratis',
    price: (fd.get('price') as string) ?? '',
    offerPrice: (fd.get('offerPrice') as string) ?? '',
    modality: (fd.get('modality') as string) ?? 'Presencial',
    city: (fd.get('city') as string) ?? '',
    district: (fd.get('district') as string) ?? '',
    address: (fd.get('address') as string) ?? '',
    accessLink: (fd.get('accessLink') as string) ?? '',
    coverImage: (fd.get('coverImage') as string) ?? '',
    slots,
  };
}

export function dbRowToValidationInput(row: DbClassRow, schedules: DbClassSchedule[]): ClassValidationInput {
  const days = schedules
    .map(s => REVERSE_DAY_MAP[s.day_of_week])
    .filter((d): d is string => Boolean(d));
  const startTime = schedules[0]?.start_time ?? '';
  const endTime = schedules[0]?.end_time ?? '';
  const recurrence = row.recurrence;
  const slots: ValidationSlot[] = schedules.length ? [{ days, startTime, endTime }] : [];

  const mainStyle = row.class_styles?.find(s => s.is_main) ?? row.class_styles?.[0];

  return {
    status: row.status,
    type: row.type,
    title: row.title ?? '',
    style: mainStyle?.dance_styles?.name ?? '',
    level: row.level?.name ?? '',
    fullDesc: row.full_description ?? '',
    recurrence,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    priceType: row.price_type,
    price: row.price,
    offerPrice: row.offer_price,
    modality: row.modality,
    city: row.venue?.city ?? '',
    district: row.venue?.district ?? '',
    address: row.venue?.address ?? '',
    accessLink: row.access_link ?? '',
    coverImage: row.cover_image ?? '',
    slots,
  };
}
