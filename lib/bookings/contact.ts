import { buildInstagramUrl, extractSocialHandle, formatSocialHandle } from '@/lib/utils';
import { formatLongDate } from './dates';

/**
 * Construye un enlace seguro de WhatsApp (`https://wa.me/...`) a partir de un teléfono.
 * Si el número tiene 9 dígitos y empieza con 9 (celular peruano sin prefijo), antepone `51`.
 */
export function buildWhatsAppChatUrl(phone: string | null | undefined, message?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 9 && digits.startsWith('9')) {
    digits = `51${digits}`;
  }
  if (digits.length < 7) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Valida que el WhatsApp tenga al menos 7 dígitos útiles. */
export function isValidWhatsAppContact(phone: string | null | undefined): boolean {
  return buildWhatsAppChatUrl(phone) !== null;
}

/** Valida que el Instagram tenga al menos 1 carácter de usuario válido además de `@` / espacios. */
export function isValidInstagramContact(handle: string | null | undefined): boolean {
  const clean = extractSocialHandle(handle, 'instagram');
  return Boolean(clean && buildInstagramUrl(clean));
}

/** Indica si el alumno ingresó al menos un canal de contacto válido (WhatsApp o Instagram). */
export function hasValidBookingContact(
  whatsapp: string | null | undefined,
  instagram: string | null | undefined,
): boolean {
  return isValidWhatsAppContact(whatsapp) || isValidInstagramContact(instagram);
}

export type ContactValidationResult =
  | { valid: true; value: string; error: null }
  | { valid: false; value: string; error: string };

const WHATSAPP_ONLY_DIGITS_ERROR = 'Ingresa solo dígitos de tu número local, sin enlaces ni espacios.';
const INSTAGRAM_STRICT_ERROR = 'Ingresa solo tu usuario de Instagram (ej. tuusuario), sin enlaces ni espacios.';
const URL_OR_LINK_PATTERN = /https?:\/\/|www\.|wa\.me|instagram\.com|\.com|\/|\?|#/i;
const INSTAGRAM_HANDLE_PATTERN = /^[a-zA-Z0-9._]{1,30}$/;

/**
 * Validador estricto para el número local de WhatsApp en BookingDialog:
 * rechaza enlaces, letras, espacios y símbolos; exige entre 7 y 15 dígitos locales.
 */
export function validateBookingWhatsApp(localNumber: string | null | undefined): ContactValidationResult {
  const raw = localNumber ?? '';
  if (!raw.trim()) {
    return { valid: false, value: '', error: 'Ingresa tu número local de WhatsApp.' };
  }
  if (URL_OR_LINK_PATTERN.test(raw) || !/^\d+$/.test(raw)) {
    return { valid: false, value: '', error: WHATSAPP_ONLY_DIGITS_ERROR };
  }
  if (raw.length < 7) {
    return { valid: false, value: '', error: 'Ingresa al menos 7 dígitos de tu número local.' };
  }
  if (raw.length > 15) {
    return { valid: false, value: '', error: 'El número local no puede tener más de 15 dígitos.' };
  }
  return { valid: true, value: raw, error: null };
}

/**
 * Validador estricto para usuario de Instagram en BookingDialog:
 * rechaza explícitamente enlaces/URLs, espacios, caracteres fuera de `^[a-zA-Z0-9._]{1,30}$` y `..`.
 */
export function validateBookingInstagram(rawHandle: string | null | undefined): ContactValidationResult {
  const raw = rawHandle ?? '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, value: '', error: 'Ingresa tu usuario de Instagram.' };
  }
  if (/\s/.test(trimmed) || URL_OR_LINK_PATTERN.test(trimmed)) {
    return { valid: false, value: '', error: INSTAGRAM_STRICT_ERROR };
  }
  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  if (!handle || handle.includes('..') || !INSTAGRAM_HANDLE_PATTERN.test(handle)) {
    return { valid: false, value: '', error: INSTAGRAM_STRICT_ERROR };
  }
  return { valid: true, value: handle, error: null };
}

/** Mensaje prellenado para que el alumno escriba al profesor y coordine el pago/confirmación. */
export function buildStudentToTeacherMessage(opts: {
  teacherName?: string;
  classTitle: string;
  date?: string;
  seats?: number;
  sessionCount?: number;
}): string {
  const first = opts.teacherName?.trim().split(/\s+/)[0];
  const greeting = first ? `Hola ${first}` : 'Hola';
  const seats = opts.seats ?? 1;
  const seatsText = `${seats} cupo${seats !== 1 ? 's' : ''}`;
  const when = opts.sessionCount && opts.sessionCount > 1
    ? ` (${opts.sessionCount} fechas)`
    : opts.date
      ? ` para el ${formatLongDate(opts.date)}`
      : '';
  return `${greeting}, acabo de solicitar ${seatsText} en "${opts.classTitle}"${when} por Kynea. Quedo atento/a para coordinar el pago y confirmar mi cupo.`;
}

/** Mensaje prellenado para que el profesor escriba al alumno que solicitó un cupo. */
export function buildTeacherToStudentMessage(opts: {
  studentName?: string;
  classTitle: string;
  date?: string;
}): string {
  const first = opts.studentName?.trim().split(/\s+/)[0];
  const greeting = first ? `Hola ${first}` : 'Hola';
  const when = opts.date ? ` del ${formatLongDate(opts.date)}` : '';
  return `${greeting}, vi tu solicitud de reserva en "${opts.classTitle}"${when} por Kynea. Te escribo para coordinar el pago y confirmar tu cupo.`;
}

export interface ResolvedContactChannels {
  whatsappUrl: string | null;
  whatsappDisplay: string | null;
  instagramUrl: string | null;
  instagramHandle: string | null;
}

/** Resuelve los canales visibles del profesor respetando `contactMode` y `showWhatsapp`. */
export function resolveTeacherChannels(opts: {
  contactMode?: 'whatsapp' | 'instagram' | 'both' | string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  showWhatsapp?: boolean | null;
  message?: string;
}): ResolvedContactChannels {
  const mode = opts.contactMode ?? 'whatsapp';
  const allowWa = (mode === 'whatsapp' || mode === 'both') && opts.showWhatsapp !== false;
  const allowIg = mode === 'instagram' || mode === 'both';

  let whatsappUrl = allowWa ? buildWhatsAppChatUrl(opts.whatsapp, opts.message) : null;
  let whatsappDisplay = whatsappUrl && opts.whatsapp ? opts.whatsapp.trim() : null;

  const rawIgUrl = opts.instagram ? buildInstagramUrl(opts.instagram) : '';
  const rawIgHandle = opts.instagram ? formatSocialHandle(opts.instagram, 'instagram') : '';
  let instagramUrl = allowIg && rawIgUrl ? rawIgUrl : null;
  let instagramHandle = allowIg && rawIgHandle ? rawIgHandle : null;

  // Fallback seguro: si el canal preferido no está cargado en el perfil, ofrece el otro si existe.
  if (!whatsappUrl && !instagramUrl) {
    if (opts.whatsapp && opts.showWhatsapp !== false) {
      whatsappUrl = buildWhatsAppChatUrl(opts.whatsapp, opts.message);
      whatsappDisplay = whatsappUrl ? opts.whatsapp.trim() : null;
    }
    if (!whatsappUrl && rawIgUrl) {
      instagramUrl = rawIgUrl;
      instagramHandle = rawIgHandle || null;
    }
  }

  return { whatsappUrl, whatsappDisplay, instagramUrl, instagramHandle };
}

/** Resuelve los canales directos de contacto de un alumno para que el profesor le escriba. */
export function resolveStudentChannels(opts: {
  whatsapp?: string | null;
  instagram?: string | null;
  message?: string;
}): ResolvedContactChannels {
  const whatsappUrl = buildWhatsAppChatUrl(opts.whatsapp, opts.message);
  const whatsappDisplay = whatsappUrl && opts.whatsapp ? opts.whatsapp.trim() : null;
  const rawIgUrl = opts.instagram ? buildInstagramUrl(opts.instagram) : '';
  const rawIgHandle = opts.instagram ? formatSocialHandle(opts.instagram, 'instagram') : '';
  return {
    whatsappUrl,
    whatsappDisplay,
    instagramUrl: rawIgUrl || null,
    instagramHandle: rawIgHandle || null,
  };
}
