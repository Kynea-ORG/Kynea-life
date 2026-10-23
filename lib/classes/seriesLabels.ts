// lib/classes/seriesLabels.ts
//
// Textos de "Mis clases" para las series mensuales (módulo puro, sin servidor).
import { monthLabel, AUTO_PUBLISH_LEAD_DAYS } from './series';

export function formatShortDate(date: string): string {
  const day = Number(date.slice(8, 10));
  return `${day} ${monthLabel(date.slice(0, 7), { short: true }).toLowerCase()}`;
}

export interface SeriesInfo {
  inSeries?: boolean;
  /** "Se publica el 20 oct" — copia en borrador programada. */
  scheduled?: string;
  /** "Publicada automáticamente el 1 oct" — solo los últimos 14 días. */
  autoPublished?: string;
  /** Motivo del primer intento fallido (falta WhatsApp, academia sin aprobar…). */
  error?: string;
}

type SeriesFields = {
  status: string;
  seriesId?: string;
  autoPublishAt?: string;
  autoPublishedAt?: string;
  autoPublishError?: string;
};

function daysBetween(from: string, to: string): number {
  return Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) -
    Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86400000);
}

export function seriesInfo(cls: SeriesFields, today: string): SeriesInfo {
  if (!cls.seriesId) return {};
  const info: SeriesInfo = { inSeries: true };

  if (cls.status === 'draft' && cls.autoPublishAt) {
    info.scheduled = cls.autoPublishAt <= today
      ? 'Se publica en las próximas horas'
      : `Se publica el ${formatShortDate(cls.autoPublishAt)}`;
  }

  if (cls.autoPublishedAt) {
    const when = cls.autoPublishedAt.slice(0, 10);
    if (daysBetween(when, today) <= AUTO_PUBLISH_LEAD_DAYS) {
      info.autoPublished = `Publicada automáticamente el ${formatShortDate(when)}`;
    }
  }

  if (cls.status === 'draft' && cls.autoPublishError) info.error = cls.autoPublishError;
  return info;
}

/** Aviso tras crear una clase (llega por ?published=1&series=N). */
export function creationToast(published: boolean, seriesCopies: number): { msg: string; durationMs: number } | null {
  if (seriesCopies > 0) {
    const copies = `${seriesCopies} ${seriesCopies === 1 ? 'copia' : 'copias'} en borrador`;
    const rest = `Creamos ${copies}: se publicarán solas ${AUTO_PUBLISH_LEAD_DAYS} días antes de cada inicio (o publícalas antes cuando quieras).`;
    return { msg: published ? `Tu clase fue publicada. ${rest}` : rest, durationMs: 7000 };
  }
  return published ? { msg: 'Tu clase fue publicada correctamente.', durationMs: 3000 } : null;
}
