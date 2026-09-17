import { describe, it, expect } from 'vitest';
import { estimateReadingTime, slugifyHeading, extractHeadings, extractFaqs } from './helpers';

describe('estimateReadingTime', () => {
  it('rounds to the nearest minute at 200 words/minute', () => {
    expect(estimateReadingTime(Array(400).fill('palabra').join(' '))).toBe(2);
  });

  it('never returns less than 1 minute, even for very short content', () => {
    expect(estimateReadingTime('Un texto corto.')).toBe(1);
  });

  it('returns 1 for empty content instead of 0', () => {
    expect(estimateReadingTime('')).toBe(1);
    expect(estimateReadingTime('   ')).toBe(1);
  });

  it('ignores markdown syntax as just more words (estimate, not exact)', () => {
    const markdown = '# Título\n\nUn [link](https://kynea.dance) y **negrita**.';
    expect(estimateReadingTime(markdown)).toBe(1);
  });
});

describe('slugifyHeading', () => {
  it('lowercases, strips accents, and hyphenates spaces', () => {
    expect(slugifyHeading('¿Cómo Elegir tu Estilo?')).toBe('como-elegir-tu-estilo');
  });

  it('drops punctuation that is not a letter, digit, space, or hyphen', () => {
    expect(slugifyHeading('Salsa, Bachata y más: ¡la guía!')).toBe('salsa-bachata-y-mas-la-guia');
  });
});

describe('extractHeadings', () => {
  it('extracts only level-2 headings, in order', () => {
    const markdown = '# Título del post\n\n## Primera sección\n\nTexto.\n\n### Subsección (nivel 3, ignorada)\n\n## Segunda sección\n';
    expect(extractHeadings(markdown)).toEqual([
      { text: 'Primera sección', slug: 'primera-seccion' },
      { text: 'Segunda sección', slug: 'segunda-seccion' },
    ]);
  });

  it('de-duplicates repeated heading text with a numeric suffix', () => {
    const markdown = '## Conclusión\n\nTexto.\n\n## Conclusión\n';
    expect(extractHeadings(markdown)).toEqual([
      { text: 'Conclusión', slug: 'conclusion' },
      { text: 'Conclusión', slug: 'conclusion-2' },
    ]);
  });

  it('returns an empty array when there are no level-2 headings', () => {
    expect(extractHeadings('Solo texto plano, sin encabezados.')).toEqual([]);
  });
});

describe('extractFaqs', () => {
  it('returns null when there is no "Preguntas frecuentes" section', () => {
    const markdown = '## Introducción\n\nTexto normal.\n\n## Conclusión\n\nMás texto.';
    expect(extractFaqs(markdown)).toBeNull();
  });

  it('parses question/answer pairs from the FAQ section', () => {
    const markdown = [
      '## Introducción',
      '',
      'Texto normal.',
      '',
      '## Preguntas frecuentes',
      '',
      '### ¿Cuánto cuesta una clase?',
      '',
      'Depende de la academia, pero desde S/40 por clase suelta.',
      '',
      '### ¿Necesito pareja para bailar salsa?',
      '',
      'No, la mayoría de las clases grupales rotan de pareja.',
    ].join('\n');

    expect(extractFaqs(markdown)).toEqual([
      { question: '¿Cuánto cuesta una clase?', answer: 'Depende de la academia, pero desde S/40 por clase suelta.' },
      { question: '¿Necesito pareja para bailar salsa?', answer: 'No, la mayoría de las clases grupales rotan de pareja.' },
    ]);
  });

  it('stops at the next level-2 heading, ignoring content after the FAQ section', () => {
    const markdown = [
      '## Preguntas frecuentes',
      '',
      '### Una pregunta',
      '',
      'Una respuesta.',
      '',
      '## Otra sección no relacionada',
      '',
      '### Esto no es una FAQ',
      '',
      'Esto no debería aparecer.',
    ].join('\n');

    expect(extractFaqs(markdown)).toEqual([
      { question: 'Una pregunta', answer: 'Una respuesta.' },
    ]);
  });

  it('strips inline markdown (bold, links) from the answer text', () => {
    const markdown = [
      '## Preguntas frecuentes',
      '',
      '### ¿Dónde veo las clases?',
      '',
      'Podés verlas en [kynea.dance](https://kynea.dance/clases), todas con **profesores verificados**.',
    ].join('\n');

    expect(extractFaqs(markdown)).toEqual([
      { question: '¿Dónde veo las clases?', answer: 'Podés verlas en kynea.dance, todas con profesores verificados.' },
    ]);
  });

  it('returns null when the FAQ section exists but has no question/answer pairs', () => {
    const markdown = '## Preguntas frecuentes\n\nTodavía no hay preguntas cargadas.';
    expect(extractFaqs(markdown)).toBeNull();
  });
});
