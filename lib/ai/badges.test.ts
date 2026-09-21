// lib/ai/badges.test.ts
import { describe, it, expect } from 'vitest';
import { getValidClassBadges } from './badges';
import type { DanceClass } from '@/lib/types';

describe('getValidClassBadges', () => {
  const mockClass: DanceClass = {
    id: 'cls-1',
    title: 'Clases de Salsa',
    slug: 'clases-de-salsa',
    style: 'Salsa',
    styleSlug: 'salsa',
    level: 'Principiante',
    shortDescription: 'Aprende los pasos básicos de salsa.',
    fullDescription: 'Clase dinámica para principiantes.',
    forWhom: 'Para personas sin experiencia',
    startDate: '2026-09-01',
    recurrence: 'mensual',
    priceType: 'Mensual',
    price: 110,
    offerPrice: 100,
    currency: 'PEN',
    modality: 'Presencial',
    city: 'Lima',
    district: 'San Juan de Miraflores',
    coverImage: '',
    coverImagePosition: '50% 50%',
    coverImageZoom: 1,
    type: 'taller',
    status: 'published',
    createdAt: '2026-09-01T00:00:00Z',
    metrics: { views: 0, contacts: 0, saved: 0 },
    timeSlots: [

      { days: ['Martes', 'Viernes'], startTime: '20:00', endTime: '21:00' },
    ],
    teacher: {
      id: 't-1',
      slug: 'tumbao-dc',
      name: 'Tumbao DC',
      type: 'academia',
      photo: '',
      photoPosition: '50% 50%',
      photoZoom: 1,
      bio: '',
      experience: 5,
      styles: ['Salsa'],
      whatsapp: '999999999',
      showSpots: true,
      email: 'tumbao@test.com',
    },
  };

  it('descarta "Sábados" y "< S/ 50" si la clase es martes/viernes a S/ 100', () => {
    const badges = ['Para principiantes', 'Sábados', '< S/ 50'];
    const valid = getValidClassBadges(mockClass, badges);

    // Solo 'Para principiantes' es verídico para esta clase
    expect(valid).toEqual(['Para principiantes']);
    expect(valid).not.toContain('Sábados');
    expect(valid).not.toContain('< S/ 50');
  });

  it('conserva badges de horario nocturno si la clase empieza después de las 18:00', () => {
    const eveningStressClass: DanceClass = {
      ...mockClass,
      fullDescription: 'Clase para soltar el estrés y desconectar después del trabajo.',
    };
    const badges = ['Horario nocturno', 'Desestresante'];
    const valid = getValidClassBadges(eveningStressClass, badges);

    expect(valid).toContain('Horario nocturno');
    expect(valid).toContain('Desestresante');
  });


  it('valida precio con offerPrice', () => {
    const cheapClass: DanceClass = {
      ...mockClass,
      price: 60,
      offerPrice: 40,
    };

    const badges = ['< S/ 50', 'Económico'];
    const valid = getValidClassBadges(cheapClass, badges);

    expect(valid).toContain('< S/ 50');
    expect(valid).toContain('Económico');
  });

  it('valida días de fin de semana correctamente', () => {
    const weekendClass: DanceClass = {
      ...mockClass,
      timeSlots: [
        { days: ['Sábado'], startTime: '10:00', endTime: '12:00' },
      ],
    };

    const badges = ['Sábados', 'Fin de semana', 'Domingos'];
    const valid = getValidClassBadges(weekendClass, badges);

    expect(valid).toContain('Sábados');
    expect(valid).toContain('Fin de semana');
    expect(valid).not.toContain('Domingos');
  });

  it('descarta "Para niños" si la clase es de noche (20:00) o no está dirigida a niños', () => {
    // mockClass es de 20:00 a 21:00
    const badges = ['Para niños', 'Salsita'];
    const valid = getValidClassBadges(mockClass, badges);

    expect(valid).not.toContain('Para niños');
  });

  it('descarta "Para niños" si la clase está marcada como Mayor +18', () => {
    const adultClass: DanceClass = {
      ...mockClass,
      ageGroup: 'Mayor +18 años',
      timeSlots: [{ days: ['Sábado'], startTime: '11:00', endTime: '12:00' }],
    };
    const badges = ['Para niños'];
    const valid = getValidClassBadges(adultClass, badges);

    expect(valid).not.toContain('Para niños');
  });

  it('permite "Para niños" si ageGroup es Niños o si el título/descripción es explícitamente infantil', () => {
    const kidsClass: DanceClass = {
      ...mockClass,
      ageGroup: 'Niños',
      timeSlots: [{ days: ['Sábado'], startTime: '10:00', endTime: '11:30' }],
    };
    expect(getValidClassBadges(kidsClass, ['Para niños'])).toContain('Para niños');

    const balletKidsClass: DanceClass = {
      ...mockClass,
      title: 'Ballet Infantil - Nivel 1',
      ageGroup: 'Apto para todos',
      timeSlots: [{ days: ['Sábado'], startTime: '10:00', endTime: '11:30' }],
    };
    expect(getValidClassBadges(balletKidsClass, ['Para niños'])).toContain('Para niños');
  });

  it('permite verificar si una clase cumple el criterio de al menos una tag de la consulta', () => {
    const queryBadges = ['Para niños', 'Fin de semana', 'Económico'];

    // mockClass es martes/viernes 20:00 a S/ 100 para adultos -> coincide en 0 tags
    const validMock = getValidClassBadges(mockClass, queryBadges);
    expect(validMock.length).toBe(0);

    // Una clase que sí es fin de semana -> coincide en 1 tag
    const weekendClass: DanceClass = {
      ...mockClass,
      timeSlots: [{ days: ['Sábado'], startTime: '11:00', endTime: '12:00' }],
    };
    const validWeekend = getValidClassBadges(weekendClass, queryBadges);
    expect(validWeekend.length).toBeGreaterThanOrEqual(1);
    expect(validWeekend).toContain('Fin de semana');

    // Una clase que sí es económica (< S/ 50) -> coincide en 1 tag
    const cheapClass: DanceClass = {
      ...mockClass,
      price: 35,
      offerPrice: undefined,
    };
    const validCheap = getValidClassBadges(cheapClass, queryBadges);
    expect(validCheap.length).toBeGreaterThanOrEqual(1);
    expect(validCheap).toContain('Económico');
  });

  it('descarta "Post-trabajo" para clases matutinas (ej. 07:00 a 09:00 am) y solo lo permite para horario nocturno (>= 18:00)', () => {
    // Clase matutina 07:00 a 09:00 (como el caso de Flamenco)
    const morningClass: DanceClass = {
      ...mockClass,
      timeSlots: [{ days: ['Jueves'], startTime: '07:00', endTime: '09:00' }],
    };

    const badges = ['Post-trabajo', 'Horario nocturno', 'Mañanas'];
    const validMorning = getValidClassBadges(morningClass, badges);

    // Debe descartar Post-trabajo y Horario nocturno, y conservar Mañanas
    expect(validMorning).not.toContain('Post-trabajo');
    expect(validMorning).not.toContain('Horario nocturno');
    expect(validMorning).toContain('Mañanas');

    // Clase nocturna 19:00 a 21:00
    const eveningClass: DanceClass = {
      ...mockClass,
      timeSlots: [{ days: ['Jueves'], startTime: '19:00', endTime: '21:00' }],
    };
    const validEvening = getValidClassBadges(eveningClass, badges);
    expect(validEvening).toContain('Post-trabajo');
    expect(validEvening).toContain('Horario nocturno');
    expect(validEvening).not.toContain('Mañanas');
  });

  it('valida el badge "Desestresante" según el contenido de la descripción o título', () => {
    const stressReliefClass: DanceClass = {
      ...mockClass,
      fullDescription: 'Un espacio para soltar el estrés, conectar contigo y desconectar de la rutina.',
    };
    expect(getValidClassBadges(stressReliefClass, ['Desestresante'])).toContain('Desestresante');

    const strictClass: DanceClass = {
      ...mockClass,
      shortDescription: 'Técnica pura y entrenamiento avanzado sin concesiones.',
      fullDescription: 'Enfoque estricto en giros y zapateado.',
    };
    expect(getValidClassBadges(strictClass, ['Desestresante'])).not.toContain('Desestresante');
  });

  it('aplica política Zero-Trust y descarta cualquier badge inventado que no se pueda verificar', () => {
    const badges = ['Vibra cool', 'Super top', 'Para principiantes'];
    const valid = getValidClassBadges(mockClass, badges);

    // Solo 'Para principiantes' está verificado y comprobado en mockClass; los no verificables se descartan
    expect(valid).toEqual(['Para principiantes']);
    expect(valid).not.toContain('Vibra cool');
    expect(valid).not.toContain('Super top');
  });
});




