// lib/ai/embeddings.ts
import type { ClassEmbeddingInput } from './types';
import { generateEmbedding } from './gemini';
import { getPublicClient } from '@/lib/supabase/public';

/**
 * Convierte todos los campos relevantes de una clase en un único texto
 * enriquecido listo para ser vectorizado por el modelo de embeddings.
 */
export function buildClassEmbeddingContent(input: ClassEmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`Clase: ${input.title.trim()}`);

  if (input.styles.length > 0) {
    parts.push(`Estilos de baile: ${input.styles.join(', ')}`);
  }

  const meta: string[] = [];
  if (input.level) meta.push(`Nivel: ${input.level}`);
  if (input.modality) meta.push(`Modalidad: ${input.modality}`);
  if (input.ageGroup) meta.push(`Grupo etario: ${input.ageGroup}`);
  if (meta.length > 0) parts.push(meta.join(' | '));

  const location: string[] = [];
  if (input.venueName) location.push(input.venueName);
  if (input.district) location.push(input.district);
  if (input.city) location.push(input.city);
  if (location.length > 0) parts.push(`Ubicación: ${location.join(', ')}`);

  if (input.price !== undefined && input.price !== null) {
    parts.push(`Precio: ${input.currency ?? 'PEN'} ${input.price}`);
  }

  if (input.shortDescription?.trim()) {
    parts.push(`Resumen: ${input.shortDescription.trim()}`);
  }

  if (input.fullDescription?.trim()) {
    parts.push(`Detalles: ${input.fullDescription.trim()}`);
  }

  if (input.whatYouLearn && input.whatYouLearn.length > 0) {
    const cleanList = input.whatYouLearn.filter(item => Boolean(item?.trim()));
    if (cleanList.length > 0) {
      parts.push(`Qué aprenderás: ${cleanList.join('. ')}`);
    }
  }

  if (input.forWhom?.trim()) {
    parts.push(`Para quién es: ${input.forWhom.trim()}`);
  }

  if (input.requirements) {
    if (Array.isArray(input.requirements)) {
      const cleanReqs = input.requirements.filter(item => Boolean(item?.trim()));
      if (cleanReqs.length > 0) {
        parts.push(`Requisitos: ${cleanReqs.join('. ')}`);
      }
    } else if (typeof input.requirements === 'string' && input.requirements.trim()) {
      parts.push(`Requisitos: ${input.requirements.trim()}`);
    }
  }

  return parts.join('\n');

}

/**
 * Genera y almacena el vector embedding para una clase dada en Supabase.
 * Retorna true si tuvo éxito, false si falló o no hay API key.
 */
export async function syncClassEmbedding(classId: string): Promise<boolean> {
  try {
    const supabase = getPublicClient();
    const { data: row, error } = await supabase
      .from('classes')
      .select(`
        id, title, modality, price, currency, short_description, full_description,
        what_you_learn, for_whom, requirements, age_group,
        level:class_levels(name),
        venue:venues(name, district, city),
        class_styles(dance_styles(name))
      `)
      .eq('id', classId)
      .single();

    if (error || !row) return false;

    const styles: string[] = [];
    if (Array.isArray(row.class_styles)) {
      for (const cs of row.class_styles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const styleName = (cs as any)?.dance_styles?.name;
        if (styleName) styles.push(styleName);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venue = row.venue as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const level = row.level as any;

    const content = buildClassEmbeddingContent({
      title: row.title,
      styles,
      level: level?.name,
      modality: row.modality,
      ageGroup: row.age_group,
      venueName: venue?.name,
      district: venue?.district,
      city: venue?.city,
      price: row.price,
      currency: row.currency,
      shortDescription: row.short_description,
      fullDescription: row.full_description,
      whatYouLearn: row.what_you_learn,
      forWhom: row.for_whom,
      requirements: row.requirements,
    });

    const vector = await generateEmbedding(content);
    if (!vector) return false;

    // Actualiza el embedding en la fila de la clase
    const { error: updateError } = await supabase
      .from('classes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ embedding: vector as any })
      .eq('id', classId);

    return !updateError;
  } catch {
    return false;
  }
}
