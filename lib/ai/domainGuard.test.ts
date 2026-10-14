// lib/ai/domainGuard.test.ts
import { describe, it, expect } from 'vitest';
import { checkQueryDomain } from './domainGuard';

describe('checkQueryDomain', () => {
  it('detecta consultas de programación y tecnología como fuera de dominio', () => {
    const q1 = checkQueryDomain('que es json y como esta estructurado?');
    expect(q1.isDefinitelyOutOfDomain).toBe(true);
    expect(q1.category).toBe('tecnología y programación');

    const q2 = checkQueryDomain('como usar react hooks con typescript');
    expect(q2.isDefinitelyOutOfDomain).toBe(true);

    const q3 = checkQueryDomain('select * from users where id = 1');
    expect(q3.isDefinitelyOutOfDomain).toBe(true);

    const q4 = checkQueryDomain('python machine learning dataframe');
    expect(q4.isDefinitelyOutOfDomain).toBe(true);
  });

  it('detecta materias académicas y ciencias como fuera de dominio', () => {
    const q1 = checkQueryDomain('como resolver ecuaciones de segundo grado');
    expect(q1.isDefinitelyOutOfDomain).toBe(true);
    expect(q1.category).toBe('materias académicas');

    const q2 = checkQueryDomain('tabla periodica de los elementos quimica');
    expect(q2.isDefinitelyOutOfDomain).toBe(true);

    const q3 = checkQueryDomain('calculo integral derivadas paso a paso');
    expect(q3.isDefinitelyOutOfDomain).toBe(true);
  });

  it('detecta recetas de cocina y mecánica como fuera de dominio', () => {
    const q1 = checkQueryDomain('receta de arroz con pollo facil');
    expect(q1.isDefinitelyOutOfDomain).toBe(true);

    const q2 = checkQueryDomain('taller mecanico cambio de aceite para auto');
    expect(q2.isDefinitelyOutOfDomain).toBe(true);
  });

  it('NUNCA marca como fuera de dominio consultas con estilos de baile o intención de danza', () => {
    // Si contiene un estilo de baile, JAMÁS es fuera de dominio
    expect(checkQueryDomain('salsa en miraflores').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('bachata tradicional').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('heels para principiantes').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('k-pop coreografias').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('clases de reggaeton').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('ballet para niños').isDefinitelyOutOfDomain).toBe(false);

    // Pregunta sobre un estilo de baile
    expect(checkQueryDomain('que es heels dance y como se baila?').isDefinitelyOutOfDomain).toBe(false);

    // Consulta con jerga o bienestar
    expect(checkQueryDomain('quiero soltar el estres despues de la chamba').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('aprender a moverme desde cero con mi pareja').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('dos pies izquierdos pero quiero bailar').isDefinitelyOutOfDomain).toBe(false);

    // Estilo con término que podría sonar a tech si se ignora el contexto de baile
    expect(checkQueryDomain('clases de salsa para gente de sistemas').isDefinitelyOutOfDomain).toBe(false);
  });

  it('respeta estilos pasados dinámicamente desde el catálogo', () => {
    expect(checkQueryDomain('clase de dancehall queen', ['Dancehall']).isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('taller de waacking intensivo', ['Waacking']).isDefinitelyOutOfDomain).toBe(false);
  });

  it('retorna false para consultas vacías o neutrales', () => {
    expect(checkQueryDomain('').isDefinitelyOutOfDomain).toBe(false);
    expect(checkQueryDomain('   ').isDefinitelyOutOfDomain).toBe(false);
  });
});
