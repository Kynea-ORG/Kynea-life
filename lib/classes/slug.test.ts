import { describe, it, expect } from 'vitest';
import { slugifyTitle, sanitizeSlugInput } from './slug';

describe('slugifyTitle', () => {
  it('pasa a minúsculas y une las palabras con guiones', () => {
    expect(slugifyTitle('Salsa Básico Desde Cero')).toBe('salsa-basico-desde-cero');
  });

  it('quita tildes y convierte la ñ', () => {
    expect(slugifyTitle('Danza Árabe — Año Nuevo')).toBe('danza-arabe-ano-nuevo');
  });

  it('elimina símbolos y signos de puntuación', () => {
    expect(slugifyTitle('¡Heels! (Nivel 2) #viernes')).toBe('heels-nivel-2-viernes');
  });

  it('conserva los números', () => {
    expect(slugifyTitle('Mi clase 02')).toBe('mi-clase-02');
  });

  it('colapsa espacios y guiones repetidos y recorta los bordes', () => {
    expect(slugifyTitle('  Bachata   --  Pareja  ')).toBe('bachata-pareja');
  });

  it('devuelve vacío si no queda nada válido', () => {
    expect(slugifyTitle('¡¡¡???')).toBe('');
    expect(slugifyTitle('')).toBe('');
  });
});

describe('sanitizeSlugInput (lo que se permite escribir a mano)', () => {
  it('permite escribir guiones y números tal cual', () => {
    expect(sanitizeSlugInput('mi-clase-02')).toBe('mi-clase-02');
  });

  it('conserva un guion final para poder seguir escribiendo', () => {
    expect(sanitizeSlugInput('mi-')).toBe('mi-');
    expect(sanitizeSlugInput('mi-clase-')).toBe('mi-clase-');
  });

  it('convierte espacios en guiones y pasa a minúsculas', () => {
    expect(sanitizeSlugInput('Mi Clase')).toBe('mi-clase');
  });

  it('quita tildes y caracteres no permitidos', () => {
    expect(sanitizeSlugInput('Clásé_nueva!')).toBe('clasenueva');
  });

  it('colapsa guiones repetidos y no deja un guion al inicio', () => {
    expect(sanitizeSlugInput('--mi---clase')).toBe('mi-clase');
  });

  it('vacío se queda vacío', () => {
    expect(sanitizeSlugInput('')).toBe('');
  });
});
