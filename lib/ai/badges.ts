// lib/ai/badges.ts
import type { DanceClass } from '@/lib/types';

/**
 * Valida los badges generados por la IA contra las propiedades reales de una clase individual.
 * Solo conserva los badges que son 100% verídicos para ESA clase específica (ej. no mostrar
 * "Sábados" en una clase de martes/viernes, ni "< S/ 50" en una clase de S/ 100).
 */
export function getValidClassBadges(
  cls: DanceClass,
  badges: string[]
): string[] {
  if (!badges || !badges.length) return [];

  return badges.filter(badge => {
    const b = badge.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    let recognized = false;

    // 1. Días de la semana / Fines de semana
    const isSaturday = b.includes('sabado') || b.includes('sab');
    const isSunday = b.includes('domingo') || b.includes('dom');
    const isWeekend = b.includes('fin de semana') || b.includes('finde');

    if (isSaturday || isSunday || isWeekend) {
      recognized = true;
      const classDays = (cls.timeSlots ?? [])
        .flatMap(t => t.days)
        .map(d => d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

      if (isSaturday && !classDays.some(d => d.includes('sab'))) return false;
      if (isSunday && !classDays.some(d => d.includes('dom'))) return false;
      if (isWeekend && !classDays.some(d => d.includes('sab') || d.includes('dom'))) return false;
    }

    // 2. Horario nocturno / Post-trabajo (jornada laboral en Perú termina ~18:00 - 19:00)
    const isAfterWorkOrNight =
      b.includes('post-trabajo') ||
      b.includes('post trabajo') ||
      b.includes('despues del trabajo') ||
      b.includes('despues de la chamba') ||
      b.includes('despues de la oficina') ||
      b.includes('after office') ||
      b.includes('nocturno') ||
      b.includes('noche');

    if (isAfterWorkOrNight) {
      recognized = true;

      // Debe tener al menos un horario nocturno a partir de las 18:00 hrs (6:00 PM)
      const hasEvening = (cls.timeSlots ?? []).some(t => {
        const hour = parseInt(t.startTime?.split(':')[0] ?? '', 10);
        return !isNaN(hour) && hour >= 18;
      });
      if (!hasEvening) return false;
    }

    // 2b. Horario mañanero / Pre-trabajo / Mañanas
    const isMorningOrPreWork =
      b.includes('manana') ||
      b.includes('tempran') ||
      b.includes('pre-trabajo') ||
      b.includes('pre trabajo') ||
      b.includes('antes del trabajo') ||
      b.includes('antes de la chamba') ||
      b.includes('antes de la oficina') ||
      b.includes('madrugador');

    if (isMorningOrPreWork) {
      recognized = true;
      // Debe tener al menos un horario matutino entre 06:00 AM y 11:59 AM
      const hasMorning = (cls.timeSlots ?? []).some(t => {
        const hour = parseInt(t.startTime?.split(':')[0] ?? '', 10);
        return !isNaN(hour) && hour >= 6 && hour < 12;
      });
      if (!hasMorning) return false;
    }

    // 3. Precio (< S/ 50, Económico, Baratito)
    const isPrice = b.includes('s/') || b.includes('economico') || b.includes('barat') || b.includes('precio');
    if (isPrice) {
      recognized = true;
      const effectivePrice = cls.offerPrice ?? cls.price;
      const matchPrice = b.match(/<\s*s\/?\s*(\d+)/) || b.match(/menos\s+de\s+(\d+)/);
      if (matchPrice) {
        const limit = parseInt(matchPrice[1], 10);
        if (!isNaN(limit) && effectivePrice > limit) return false;
      } else if (b.includes('economico') || b.includes('barat')) {
        if (effectivePrice > 45) return false;
      }
    }

    // 4. Nivel (Principiantes / Desde cero / Intermedio / Avanzado / Básico)
    const isLevel =
      b.includes('principiante') ||
      b.includes('desde cero') ||
      b.includes('iniciacion') ||
      b.includes('sin experiencia') ||
      b.includes('intermedio') ||
      b.includes('avanzado') ||
      b.includes('basico');

    if (isLevel) {
      recognized = true;
      const levelNorm = (cls.level ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const forWhomNorm = (cls.forWhom ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (b.includes('intermedio') && !levelNorm.includes('intermedio')) return false;
      if (b.includes('avanzado') && !levelNorm.includes('avanzado')) return false;
      if (
        b.includes('principiante') ||
        b.includes('desde cero') ||
        b.includes('iniciacion') ||
        b.includes('sin experiencia') ||
        b.includes('basico')
      ) {
        const isBeginner =
          levelNorm.includes('principiante') ||
          levelNorm.includes('basico') ||
          levelNorm.includes('todos') ||
          forWhomNorm.includes('sin experiencia') ||
          forWhomNorm.includes('desde cero');
        if (!isBeginner) return false;
      }
    }

    // 5. Grupo etario (Niños / Chibolos / Kids / Adultos)
    const isAge =
      b.includes('nino') ||
      b.includes('kid') ||
      b.includes('chibolo') ||
      b.includes('peque') ||
      b.includes('infantil') ||
      b.includes('adulto') ||
      b.includes('+18');

    if (isAge) {
      recognized = true;
      const ageNorm = (cls.ageGroup ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (b.includes('adulto') || b.includes('+18')) {
        if (ageNorm.includes('nino')) return false;
      }

      if (
        b.includes('nino') ||
        b.includes('kid') ||
        b.includes('chibolo') ||
        b.includes('peque') ||
        b.includes('infantil')
      ) {
        // Regla A: Si es para mayores de edad, descartar de inmediato
        if (ageNorm.includes('+18') || ageNorm.includes('mayor')) return false;

        // Regla B: Si el horario es nocturno (a partir de las 20:00 hrs), no es clase infantil
        const startsAtNight = (cls.timeSlots ?? []).some(t => {
          const hour = parseInt(t.startTime?.split(':')[0] ?? '', 10);
          return !isNaN(hour) && hour >= 20;
        });
        if (startsAtNight) return false;

        // Regla C: Debe estar explícitamente marcada como Niños o mencionarlo en título/para quién
        const textToSearch = [
          cls.title,
          cls.forWhom ?? '',
          cls.shortDescription ?? '',
        ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const isExplicitlyForKids =
          ageNorm === 'ninos' ||
          textToSearch.includes('kid') ||
          textToSearch.includes('nino') ||
          textToSearch.includes('infantil') ||
          textToSearch.includes('junior') ||
          textToSearch.includes('peque');

        if (!isExplicitlyForKids) return false;
      }
    }

    // 6. Modalidad (Online / Presencial)
    if (b.includes('online') || b.includes('virtual') || b.includes('presencial')) {
      recognized = true;
      if ((b.includes('online') || b.includes('virtual')) && cls.modality !== 'Online') return false;
      if (b.includes('presencial') && cls.modality !== 'Presencial') return false;
    }

    // 7. Beneficio emocional / Bienestar (Desestresante, Soltar el cuerpo, Relajación)
    if (b.includes('desestres') || b.includes('soltar') || b.includes('relaj') || b.includes('bienestar')) {
      recognized = true;
      const textToSearch = [
        cls.title,
        cls.shortDescription ?? '',
        cls.fullDescription ?? '',
        cls.forWhom ?? '',
      ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const matchesWellness =
        textToSearch.includes('desestres') ||
        textToSearch.includes('estres') ||
        textToSearch.includes('relaj') ||
        textToSearch.includes('soltar') ||
        textToSearch.includes('conectar') ||
        textToSearch.includes('desconectar') ||
        textToSearch.includes('disfrut') ||
        textToSearch.includes('diverti') ||
        textToSearch.includes('sentirte bien') ||
        textToSearch.includes('cero exigencia') ||
        textToSearch.includes('terapia') ||
        textToSearch.includes('libera');

      if (!matchesWellness) return false;
    }

    // 8. Beneficio físico / Dinamismo (Energizante, Cardio, Fitness, Resistencia)
    if (b.includes('energiz') || b.includes('cardio') || b.includes('fit') || b.includes('resistencia')) {
      recognized = true;
      const textToSearch = [
        cls.title,
        cls.style,
        cls.shortDescription ?? '',
        cls.fullDescription ?? '',
      ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const matchesEnergy =
        textToSearch.includes('energi') ||
        textToSearch.includes('cardio') ||
        textToSearch.includes('fit') ||
        textToSearch.includes('fuerza') ||
        textToSearch.includes('resistencia') ||
        textToSearch.includes('dinamic') ||
        textToSearch.includes('quemar') ||
        textToSearch.includes('intenso') ||
        textToSearch.includes('potencia');

      if (!matchesEnergy) return false;
    }

    // Política Zero-Trust: Solo se aprueban badges verificados contra los datos duros de la clase.
    // Si la IA inventa una etiqueta no comprobable, se descarta para evitar información falsa.
    return recognized;
  });
}


