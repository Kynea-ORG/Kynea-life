// lib/classes/seriesCopies.ts
//
// Crea las copias mensuales de una clase recién creada (ver lib/classes/series.ts).
// Sigue el patrón de duplicateClass (lib/classes/actions.ts): clona la fila de la
// original sin identificadores, contadores ni marcas de publicación, y re-inserta
// estilos y horarios con el nuevo class_id. Las copias nacen SIEMPRE en borrador;
// con `autoPublish` quedan programadas para publicarse solas 14 días antes de su
// inicio (la función SQL publish_due_series_copies, migración 62).
import type { SupabaseClient } from '@supabase/supabase-js';
import { autoPublishDate, monthLabel, shiftToMonth } from './series';

export type SeriesCopiesResult =
  | { ok: true; createdIds: string[] }
  | { ok: false; message: string };

// Columnas que NO se heredan de la original.
const OMITTED = ['id', 'created_at', 'updated_at', 'views_count', 'contacts_count', 'saved_count', 'slug', 'published_at'] as const;

function monthSlug(month: string): string {
  return monthLabel(month).toLowerCase().replace(/\s+/g, '-');
}

export async function createSeriesCopies(
  supabase: SupabaseClient,
  params: { originalId: string; teacherId: string; months: string[]; autoPublish: boolean },
): Promise<SeriesCopiesResult> {
  const { originalId, teacherId, months, autoPublish } = params;
  if (months.length === 0) return { ok: true, createdIds: [] };

  const [originalRes, stylesRes, schedulesRes] = await Promise.all([
    supabase.from('classes').select('*').eq('id', originalId).eq('teacher_id', teacherId).single(),
    supabase.from('class_styles').select('style_id, is_main').eq('class_id', originalId),
    supabase.from('class_schedules').select('day_of_week, start_time, end_time').eq('class_id', originalId),
  ]);

  const original = originalRes.data as Record<string, unknown> | null;
  if (originalRes.error || !original) return { ok: false, message: 'No se encontró la clase original' };

  const startDate = original.start_date as string | null;
  if (!startDate) return { ok: false, message: 'La clase original no tiene fecha de inicio' };
  const endDate = (original.end_date as string | null) ?? startDate;

  // La original también forma parte de la serie.
  let seriesId = original.series_id as string | null;
  if (!seriesId) {
    seriesId = globalThis.crypto.randomUUID();
    const { error } = await supabase.from('classes').update({ series_id: seriesId }).eq('id', originalId);
    if (error) return { ok: false, message: 'No se pudo vincular la serie de clases' };
  }

  const base = { ...original };
  for (const k of OMITTED) delete base[k];

  const styles = (stylesRes.data ?? []) as { style_id: number; is_main: boolean }[];
  const schedules = (schedulesRes.data ?? []) as { day_of_week: number; start_time: string; end_time: string }[];
  const baseSlug = (original.slug as string | null) ?? '';

  const createdIds: string[] = [];
  const rollback = async (message: string): Promise<SeriesCopiesResult> => {
    if (createdIds.length) await supabase.from('classes').delete().in('id', createdIds);
    return { ok: false, message };
  };

  for (const month of months) {
    const dates = shiftToMonth(startDate, endDate, month);
    const { data: created, error } = await supabase
      .from('classes')
      .insert({
        ...base,
        series_id: seriesId,
        status: 'draft',
        published_at: null,
        start_date: dates.startDate,
        end_date: dates.endDate,
        available_spots: (original.max_spots as number | null) ?? null,
        auto_publish_at: autoPublish ? autoPublishDate(dates.startDate) : null,
        auto_published_at: null,
        auto_publish_error: null,
        slug: baseSlug ? `${baseSlug}-${monthSlug(month)}` : '',
      })
      .select('id')
      .single();

    if (error || !created) return rollback('No se pudo crear una de las copias de la clase');
    const copyId = (created as { id: string }).id;
    createdIds.push(copyId);

    const [stylesInsert, schedulesInsert] = await Promise.all([
      styles.length ? supabase.from('class_styles').insert(styles.map(s => ({ ...s, class_id: copyId }))) : Promise.resolve({ error: null }),
      schedules.length ? supabase.from('class_schedules').insert(schedules.map(s => ({ ...s, class_id: copyId }))) : Promise.resolve({ error: null }),
    ]);
    if (stylesInsert.error || schedulesInsert.error) return rollback('No se pudieron copiar los horarios de la clase');
  }

  return { ok: true, createdIds };
}
