// lib/ai/refinedTitle.ts
import type { AiSearchFilters } from './types';

/**
 * Genera un título limpio, natural y determinista para la página de resultados
 * cuando el usuario ha refinado o relajado filtros (ej. buscar fuera de una ciudad
 * o retirar chips de nivel/edad).
 */
export function formatRefinedTitle(filters?: AiSearchFilters | null, tags: string[] = []): string {
  if (!filters && (!tags || !tags.length)) return 'Todas las clases';

  const parts: string[] = [];

  // 1. Núcleo: Estilo de baile o genérico 'Clases de baile'
  if (filters?.style) {
    parts.push(`Clases de ${filters.style}`);
  } else {
    parts.push('Clases de baile');
  }

  // 2. Nivel
  if (filters?.level) {
    const l = filters.level.toLowerCase();
    if (l.includes('adult') || l.includes('niñ') || l.includes('kid') || l.includes('chibolo')) {
      // Ignorar si por error quedó un valor de edad en level
    } else if (l.includes('principiante') || l.includes('iniciacion') || l.includes('cero')) {
      parts.push('para principiantes');
    } else if (l.includes('intermedio')) {
      parts.push('nivel intermedio');
    } else if (l.includes('avanzado')) {
      parts.push('nivel avanzado');
    } else {
      parts.push(`nivel ${filters.level}`);
    }
  }

  const normTags = (tags ?? []).map(t =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  );

  // 3. Público / Edad
  if (filters?.ageGroup) {
    const a = filters.ageGroup.toLowerCase();
    if (a.includes('niño') || a.includes('infantil') || a.includes('kid') || a.includes('chibolo')) {
      parts.push('para niños');
    } else if (a.includes('adulto')) {
      parts.push('para adultos');
    }
  } else if (normTags.some(t => t.includes('adult'))) {
    parts.push('para adultos');
  } else if (normTags.some(t => t.includes('nin') || t.includes('kid') || t.includes('chibolo') || t.includes('infantil'))) {
    parts.push('para niños');
  }

  // 4. Modalidad
  if (filters?.modality === 'Online') {
    parts.push('online');
  }

  // 5. Horario
  if (filters?.timeOfDay === 'afternoon') {
    parts.push('en la tarde');
  } else if (filters?.timeOfDay === 'evening' || filters?.timeOfDay === 'night') {
    parts.push('en horario nocturno');
  } else if (filters?.timeOfDay === 'morning') {
    parts.push('en las mañanas');
  } else if (normTags.some(t => t === 'tarde' || t === 'tardes' || t.includes('horario tarde'))) {
    parts.push('en la tarde');
  } else if (normTags.some(t => t === 'manana' || t === 'mananas' || t.includes('horario manana'))) {
    parts.push('en las mañanas');
  } else if (normTags.some(t => t === 'noche' || t === 'noches' || t.includes('horario nocturno') || t.includes('post-trabajo'))) {
    parts.push('en horario nocturno');
  }

  // 6. Días de la semana
  if (filters?.daysOfWeek && filters.daysOfWeek.length > 0) {
    const sorted = [...filters.daysOfWeek].sort((a, b) => a - b).join(',');
    if (sorted === '5,6') {
      parts.push('los fines de semana');
    } else if (sorted === '5') {
      parts.push('los sábados');
    } else if (sorted === '6') {
      parts.push('los domingos');
    } else if (filters.daysOfWeek.length === 1) {
      const dayLabels = ['los lunes', 'los martes', 'los miércoles', 'los jueves', 'los viernes', 'los sábados', 'los domingos'];
      const d = filters.daysOfWeek[0];
      if (dayLabels[d]) parts.push(dayLabels[d]);
    }
  } else if (normTags.some(t => t.includes('fin de semana') || t.includes('finde'))) {
    parts.push('los fines de semana');
  }

  // 7. Ubicación (Distrito o Ciudad)
  if (filters?.district) {
    parts.push(`en ${filters.district}`);
  } else if (filters?.city) {
    parts.push(`en ${filters.city}`);
  }

  return parts.join(' ');
}
