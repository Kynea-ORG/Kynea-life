// lib/ai/searchService.ts
import { getPublicClient } from '@/lib/supabase/public';
import { fetchPublishedClasses, fetchClassesByIds } from '@/lib/classes/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { generateEmbedding, parseSearchQuery, sanitizeSearchQuery } from './gemini';
import { getValidClassBadges } from './badges';
import type { AiSearchResult, AiSearchInterpretation } from './types';

const COMMON_DISTRICTS = [
  'Miraflores', 'San Isidro', 'Santiago de Surco', 'Surco', 'Barranco',
  'Lince', 'San Miguel', 'Magdalena del Mar', 'Jesús María', 'Pueblo Libre',
  'San Borja', 'La Molina', 'Los Olivos', 'Independencia', 'Callao',
];

/**
 * Servicio unificado de búsqueda inteligente con IA (Filtros Duros + Semántica + Badges + Resumen).
 * Si la IA no está disponible o no hay clave configurada, degrada de forma transparente
 * a la búsqueda relacional estándar de Kynea.
 */
export async function searchClassesWithAi(
  query: string,
  options?: { city?: string }
): Promise<AiSearchResult> {
  const trimmed = sanitizeSearchQuery(query);
  if (!trimmed) {
    const classes = await fetchPublishedClasses({ city: options?.city });
    return { classes, aiSummary: null, matchBadges: [], interpretation: null };
  }

  // 1. Obtener estilos del catálogo para alimentar el prompt con contexto
  let danceStyles: string[] = [];
  try {
    const styles = await fetchDanceStyles();
    danceStyles = styles.map(s => s.name);
  } catch {
    // Silencioso: si falla el catálogo, el parser igual puede funcionar
  }

  // 2. Interpretar la consulta en lenguaje natural con Gemini
  let interpretation: AiSearchInterpretation | null = null;
  try {
    interpretation = await parseSearchQuery(trimmed, {
      danceStyles,
      districts: COMMON_DISTRICTS,
    });
  } catch (err) {
    console.warn('[searchClassesWithAi] Error parsing with Gemini:', err);
  }

  const supabase = getPublicClient();

  // 3. Si la IA logró interpretar la consulta, intentamos búsqueda híbrida con pgvector
  if (interpretation) {
    try {
      const { filters, semanticQuery } = interpretation;

      // Generar embedding del concepto semántico si hay texto y API key
      const queryEmbedding = semanticQuery ? await generateEmbedding(semanticQuery) : null;

      // Ejecutar RPC match_classes_hybrid
      const { data: rpcMatches, error: rpcError } = await supabase.rpc('match_classes_hybrid', {
        query_embedding: queryEmbedding ?? null,
        filter_style: filters.style ?? null,
        filter_district: filters.district ?? null,
        filter_city: filters.city ?? options?.city ?? null,
        filter_max_price: filters.maxPrice ?? null,
        filter_days: filters.daysOfWeek ?? null,
        filter_modality: filters.modality ?? null,
        filter_level: filters.level ?? null,
        filter_age_group: filters.ageGroup ?? null,
        match_count: 24,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let classMatches: any[] | null =
        !rpcError && Array.isArray(rpcMatches) && rpcMatches.length > 0 ? rpcMatches : null;
      let finalSummary = interpretation.aiSummary;

      // Detectar si la consulta pide explícitamente público infantil (Niños / Chibolos / Kids)
      const isKidsSearch = Boolean(
        filters.ageGroup?.toLowerCase().includes('niño') ||
        trimmed.toLowerCase().includes('chibolo') ||
        trimmed.toLowerCase().includes('niño') ||
        trimmed.toLowerCase().includes('kid') ||
        interpretation.matchBadges?.some(b => b.toLowerCase().includes('niño') || b.toLowerCase().includes('kid'))
      );
      const ageFilter = isKidsSearch ? 'Niños' : null;

      // Cascada Inteligente: Si los filtros estrictos dieron 0 resultados, relajamos restricciones secundarias
      if (!classMatches || classMatches.length === 0) {
        // Nivel 2: Mantener estilo y distrito, pero relajar precio y días.
        // NUNCA relajar edad si es Niños (un padre buscando para su hijo no puede recibir clases de adultos).
        const { data: relaxedPriceAndDays } = await supabase.rpc('match_classes_hybrid', {
          query_embedding: queryEmbedding ?? null,
          filter_style: filters.style ?? null,
          filter_district: filters.district ?? null,
          filter_city: filters.city ?? options?.city ?? null,
          filter_max_price: null,
          filter_days: null,
          filter_modality: filters.modality ?? null,
          filter_level: filters.level ?? null,
          filter_age_group: ageFilter,
          match_count: 24,
        });

        if (Array.isArray(relaxedPriceAndDays) && relaxedPriceAndDays.length > 0) {
          classMatches = relaxedPriceAndDays;
          finalSummary = `No encontramos clases exactas con todos los filtros de horario o precio, pero encontramos estas opciones de ${filters.style || 'baile'}:`;
        } else if (filters.style || queryEmbedding) {
          // Nivel 3: Si tampoco había en ese distrito específico, relajar distrito manteniendo el estilo
          const { data: relaxedDistrict } = await supabase.rpc('match_classes_hybrid', {
            query_embedding: queryEmbedding ?? null,
            filter_style: filters.style ?? null,
            filter_district: null,
            filter_city: null,
            filter_max_price: null,
            filter_days: null,
            filter_modality: null,
            filter_level: null,
            filter_age_group: ageFilter,
            match_count: 24,
          });

          if (Array.isArray(relaxedDistrict) && relaxedDistrict.length > 0) {
            classMatches = relaxedDistrict;
            finalSummary = `No encontramos clases de ${filters.style || 'ese estilo'} en esa zona exacta, pero te sugerimos estas opciones cercanas:`;
          }
        }
      }

      if (classMatches && classMatches.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const classIds = classMatches.map((m: any) => m.id as string).filter(Boolean);
        let hydratedClasses = await fetchClassesByIds(classIds);

        // A. Si la búsqueda pedía público infantil, descartar cualquier clase que no sea para niños
        if (isKidsSearch) {
          hydratedClasses = hydratedClasses.filter(c => {
            const validKids = getValidClassBadges(c, ['Para niños']);
            return validKids.length > 0;
          });
        }

        // B. Horario post-trabajo / noche (Jornada laboral en Perú termina ~18:00 - 19:00)
        // Clases de la mañana (ej. 07:00 AM) NUNCA deben mostrarse para búsquedas "después del trabajo"
        const isEveningSearch = Boolean(
          filters.timeOfDay === 'evening' ||
          filters.timeOfDay === 'night' ||
          trimmed.toLowerCase().includes('despues del trabajo') ||
          trimmed.toLowerCase().includes('post-trabajo') ||
          trimmed.toLowerCase().includes('post trabajo') ||
          trimmed.toLowerCase().includes('despues de la chamba') ||
          trimmed.toLowerCase().includes('nocturno') ||
          trimmed.toLowerCase().includes('noche') ||
          trimmed.toLowerCase().includes('after office') ||
          interpretation.matchBadges?.some(b => {
            const norm = b.toLowerCase();
            return norm.includes('post-trabajo') || norm.includes('nocturno') || norm.includes('noche');
          })
        );

        if (isEveningSearch) {
          hydratedClasses = hydratedClasses.filter(c => {
            return (c.timeSlots ?? []).some(t => {
              const hour = parseInt(t.startTime?.split(':')[0] ?? '', 10);
              return !isNaN(hour) && hour >= 18;
            });
          });
        }

        // B2. Horario mañanero / pre-trabajo (antes de entrar a la oficina)
        const isMorningSearch = Boolean(
          filters.timeOfDay === 'morning' ||
          trimmed.toLowerCase().includes('manana') ||
          trimmed.toLowerCase().includes('temprano') ||
          trimmed.toLowerCase().includes('antes del trabajo') ||
          trimmed.toLowerCase().includes('antes de la chamba') ||
          trimmed.toLowerCase().includes('pre-trabajo') ||
          interpretation.matchBadges?.some(b => b.toLowerCase().includes('manana') || b.toLowerCase().includes('temprano'))
        );

        if (isMorningSearch) {
          hydratedClasses = hydratedClasses.filter(c => {
            return (c.timeSlots ?? []).some(t => {
              const hour = parseInt(t.startTime?.split(':')[0] ?? '', 10);
              return !isNaN(hour) && hour >= 6 && hour < 12;
            });
          });
        }

        // C. Coincidencia Mínima: Si la consulta generó tags de preferencia (ej. Para niños, Fin de semana, Económico),
        // cada tarjeta mostrada DEBE coincidir en AL MENOS una tag de la búsqueda.
        // Si una clase coincide en 0 tags, se descarta para evitar cards irrelevantes que contradicen lo solicitado.

        const queryBadges = interpretation.matchBadges ?? [];
        if (queryBadges.length > 0) {
          hydratedClasses = hydratedClasses.filter(c => {
            const valid = getValidClassBadges(c, queryBadges);
            return valid.length > 0;
          });
        }

        // C. Banner Coherente: Solo conservar los badges que al menos una clase mostrada realmente posee
        const activeBadges = queryBadges.filter(b =>
          hydratedClasses.some(c => getValidClassBadges(c, [b]).length > 0)
        );

        if (hydratedClasses.length > 0) {
          return {
            classes: hydratedClasses,
            aiSummary: finalSummary,
            matchBadges: activeBadges,
            interpretation,
          };
        } else {
          // Si ninguna clase cumplió el mínimo de coincidencia (0 matches relevantes)
          const filterDetails = queryBadges.length > 0 ? ` (${queryBadges.join(', ')})` : '';
          return {
            classes: [],
            aiSummary: `No encontramos clases de ${filters.style || 'baile'} que coincidan con tus preferencias${filterDetails}. Prueba buscando con menos restricciones o ampliando los filtros.`,
            matchBadges: [],
            interpretation,
          };
        }
      } else {
        // RPC no encontró resultados en ningún nivel de relajación
        const queryBadges = interpretation.matchBadges ?? [];
        const filterDetails = queryBadges.length > 0 ? ` (${queryBadges.join(', ')})` : '';
        return {
          classes: [],
          aiSummary: `No encontramos clases de ${filters.style || 'baile'} que coincidan con tus criterios${filterDetails}. Te sugerimos ampliar tu búsqueda.`,
          matchBadges: [],
          interpretation,
        };
      }
    } catch (err) {
      console.warn('[searchClassesWithAi] Hybrid RPC match failed, falling back to standard search:', err);
    }
  }

  // 4. Fallback estándar (solo si la IA no estuvo disponible o falló la interpretación)
  const fallbackClasses = await fetchPublishedClasses({
    query: trimmed,
    city: options?.city,
  });

  return {
    classes: fallbackClasses,
    aiSummary: null,
    matchBadges: [],
    interpretation: null,
  };
}

export { getValidClassBadges } from './badges';



