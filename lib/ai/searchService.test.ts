// lib/ai/searchService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as geminiModule from './gemini';
import * as classesQueries from '@/lib/classes/queries';
import * as publicClient from '@/lib/supabase/public';
import { searchClassesWithAi } from './searchService';
import type { DanceClass } from '@/lib/types';

describe('searchClassesWithAi', () => {
  const mockAdultClass: DanceClass = {
    id: 'cls-adult',
    title: 'Clases de Salsa Adultos',
    slug: 'clases-de-salsa',
    style: 'Salsa',
    styleSlug: 'salsa',
    level: 'Principiante',
    shortDescription: 'Salsa para adultos',
    fullDescription: 'Clase nocturna',
    forWhom: 'Para mayores de edad',
    ageGroup: 'Mayor +18 años',
    startDate: '2026-09-01',
    recurrence: 'mensual',
    priceType: 'Mensual',
    price: 110,
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
      slug: 'tumbao',
      name: 'Tumbao',
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

  const mockWeekendClass: DanceClass = {
    ...mockAdultClass,
    id: 'cls-weekend',
    title: 'Salsa Fin de Semana',
    timeSlots: [
      { days: ['Sábado'], startTime: '10:00', endTime: '11:30' },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('descarta clases que coinciden en 0 tags cuando la búsqueda solicitó tags específicos', async () => {
    // Simular que Gemini interpretó la query con tags específicos
    vi.spyOn(geminiModule, 'parseSearchQuery').mockResolvedValue({
      filters: { style: 'Salsa', district: 'Lince', ageGroup: 'Niños' },
      semanticQuery: 'salsa niños fin de semana',
      aiSummary: 'Buscando salsa para niños el finde',
      matchBadges: ['Para niños', 'Fin de semana', 'Económico'],
      isDirectProfileSearch: false,
    });

    vi.spyOn(geminiModule, 'generateEmbedding').mockResolvedValue(null);

    // Simular Supabase RPC que devolvió la clase de adultos en Nivel 3 relajado
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: [{ id: 'cls-adult' }], error: null }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        ilike: vi.fn().mockResolvedValue({ data: [] }),
        or: vi.fn().mockResolvedValue({ data: [] }),
      }),
    };
    vi.spyOn(publicClient, 'getPublicClient').mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof publicClient.getPublicClient>
    );

    // Simular hidratación de clases
    vi.spyOn(classesQueries, 'fetchClassesByIds').mockResolvedValue([mockAdultClass]);

    const result = await searchClassesWithAi('Salsita en Lince pa chibolos este finde baratito');

    // Como cls-adult no coincide en NINGUNA tag (ni niños, ni finde, ni económico), debe descartarse
    expect(result.classes).toHaveLength(0);
    expect(result.matchBadges).toHaveLength(0);
    expect(result.aiSummary).toContain('No encontramos clases de Salsa');
  });

  it('conserva clases que coinciden en al menos 1 tag y mantiene solo tags activas en el banner', async () => {
    vi.spyOn(geminiModule, 'parseSearchQuery').mockResolvedValue({
      filters: { style: 'Salsa', district: 'Lince' },
      semanticQuery: 'salsa fin de semana',
      aiSummary: 'Buscando salsa en fin de semana',
      matchBadges: ['Fin de semana', 'Económico'],
      isDirectProfileSearch: false,
    });

    vi.spyOn(geminiModule, 'generateEmbedding').mockResolvedValue(null);

    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: [{ id: 'cls-weekend' }], error: null }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        ilike: vi.fn().mockResolvedValue({ data: [] }),
        or: vi.fn().mockResolvedValue({ data: [] }),
      }),
    };
    vi.spyOn(publicClient, 'getPublicClient').mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof publicClient.getPublicClient>
    );

    vi.spyOn(classesQueries, 'fetchClassesByIds').mockResolvedValue([mockWeekendClass]);

    const result = await searchClassesWithAi('Salsa este finde');

    // cls-weekend coincide en Fin de semana (1 tag), aunque no es económica (S/ 110)
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].id).toBe('cls-weekend');
    // Solo 'Fin de semana' está activa; 'Económico' se descarta del banner
    expect(result.matchBadges).toEqual(['Fin de semana']);
    expect(result.matchBadges).not.toContain('Económico');
  });

  it('filtra clases matutinas (07:00 AM) cuando la consulta pide después del trabajo y solo conserva las nocturnas', async () => {
    const morningFlamenco: DanceClass = {
      ...mockAdultClass,
      id: 'cls-flamenco-morning',
      title: 'Flamenco Iniciación',
      timeSlots: [{ days: ['Jueves'], startTime: '07:00', endTime: '09:00' }],
      fullDescription: 'Espacio para soltar el estrés',
    };

    const eveningFlamenco: DanceClass = {
      ...mockAdultClass,
      id: 'cls-flamenco-evening',
      title: 'Flamenco Noche',
      timeSlots: [{ days: ['Jueves'], startTime: '19:00', endTime: '21:00' }],
      fullDescription: 'Espacio para soltar el estrés después de la oficina',
    };

    vi.spyOn(geminiModule, 'parseSearchQuery').mockResolvedValue({
      filters: { timeOfDay: 'evening', level: 'Principiante' },
      semanticQuery: 'desestresante soltar el cuerpo relajacion despues del trabajo',
      aiSummary: 'Clases desestresantes después del trabajo',
      matchBadges: ['Post-trabajo', 'Desestresante', 'Para principiantes'],
      isDirectProfileSearch: false,
    });

    vi.spyOn(geminiModule, 'generateEmbedding').mockResolvedValue(null);

    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ id: 'cls-flamenco-morning' }, { id: 'cls-flamenco-evening' }],
        error: null,
      }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        ilike: vi.fn().mockResolvedValue({ data: [] }),
        or: vi.fn().mockResolvedValue({ data: [] }),
      }),
    };

    vi.spyOn(publicClient, 'getPublicClient').mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof publicClient.getPublicClient>
    );

    vi.spyOn(classesQueries, 'fetchClassesByIds').mockResolvedValue([morningFlamenco, eveningFlamenco]);

    const result = await searchClassesWithAi('Clases para desestresarme después del trabajo y soltar el cuerpo');

    // La clase de las 07:00 am se descarta rotundamente
    expect(result.classes.some(c => c.id === 'cls-flamenco-morning')).toBe(false);
    // La clase de las 19:00 pm se conserva
    expect(result.classes.some(c => c.id === 'cls-flamenco-evening')).toBe(true);
    // Badges en banner
    expect(result.matchBadges).toContain('Post-trabajo');
  });
});

