// lib/ai/embeddings.test.ts
import { describe, it, expect } from 'vitest';
import { buildClassEmbeddingContent } from './embeddings';

describe('buildClassEmbeddingContent', () => {
  it('genera un texto estructurado completo con todos los campos disponibles', () => {
    const content = buildClassEmbeddingContent({
      title: 'Salsa Cubana para Principiantes',
      styles: ['Salsa', 'Timba'],
      level: 'Principiante',
      modality: 'Presencial',
      ageGroup: 'adultos',
      venueName: 'Sede Principal',
      district: 'Miraflores',
      city: 'Lima',
      price: 45,
      currency: 'PEN',
      shortDescription: 'Aprende los pasos básicos del casino cubano.',
      fullDescription: 'Clase dinámica con calentamiento, técnica de vueltas y rueda de casino.',
      whatYouLearn: ['Paso básico y dile que no', 'Coordinación y musicalidad'],
      forWhom: 'Para personas sin experiencia previa que quieran soltarse bailando.',
      requirements: 'Ropa cómoda y zapatillas sin suela de agarre excesivo.',
    });

    expect(content).toContain('Clase: Salsa Cubana para Principiantes');
    expect(content).toContain('Estilos de baile: Salsa, Timba');
    expect(content).toContain('Nivel: Principiante | Modalidad: Presencial | Grupo etario: adultos');
    expect(content).toContain('Ubicación: Sede Principal, Miraflores, Lima');
    expect(content).toContain('Precio: PEN 45');
    expect(content).toContain('Resumen: Aprende los pasos básicos del casino cubano.');
    expect(content).toContain('Qué aprenderás: Paso básico y dile que no. Coordinación y musicalidad');
    expect(content).toContain('Para quién es: Para personas sin experiencia previa que quieran soltarse bailando.');
    expect(content).toContain('Requisitos: Ropa cómoda y zapatillas sin suela de agarre excesivo.');
  });

  it('omite campos nulos o vacíos sin romper el formato', () => {
    const content = buildClassEmbeddingContent({
      title: 'Bachata Sensual',
      styles: ['Bachata'],
      modality: 'Online',
      price: null,
      shortDescription: 'Clase virtual para todos los niveles.',
    });

    expect(content).toContain('Clase: Bachata Sensual');
    expect(content).toContain('Estilos de baile: Bachata');
    expect(content).toContain('Modalidad: Online');
    expect(content).not.toContain('Ubicación:');
    expect(content).not.toContain('Precio:');
    expect(content).not.toContain('Requisitos:');
  });

  it('limpia elementos vacíos de whatYouLearn', () => {
    const content = buildClassEmbeddingContent({
      title: 'Taller de Hip Hop',
      styles: ['Hip Hop'],
      modality: 'Presencial',
      whatYouLearn: ['Groove y aislamiento', '', '  ', 'Fundamentos de bounce'],
    });

    expect(content).toContain('Qué aprenderás: Groove y aislamiento. Fundamentos de bounce');
  });

  it('soporta requirements como array de strings', () => {
    const content = buildClassEmbeddingContent({
      title: 'Ballet Clásico',
      styles: ['Ballet'],
      modality: 'Presencial',
      requirements: ['Malla negra', 'Zapatillas de media punta', ''],
    });

    expect(content).toContain('Requisitos: Malla negra. Zapatillas de media punta');
  });
});

