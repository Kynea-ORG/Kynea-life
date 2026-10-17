import { describe, it, expect } from 'vitest';
import {
  listSelectableMonths,
  shiftToMonth,
  autoPublishDate,
  parseSeriesMonths,
  monthLabel,
  MAX_SERIES_MONTHS,
} from './series';

describe('listSelectableMonths', () => {
  it('devuelve los meses posteriores al inicial, hasta 11, en orden', () => {
    const months = listSelectableMonths('2026-10-03', '2026-10-10');
    expect(months[0]).toBe('2026-11');
    expect(months).toHaveLength(MAX_SERIES_MONTHS);
    expect(months[months.length - 1]).toBe('2027-09');
  });

  it('cruza el cambio de año', () => {
    const months = listSelectableMonths('2026-12-01', '2026-12-05');
    expect(months.slice(0, 2)).toEqual(['2027-01', '2027-02']);
  });

  it('nunca incluye meses ya pasados ni el mes inicial', () => {
    const months = listSelectableMonths('2026-10-03', '2026-08-01');
    expect(months).not.toContain('2026-08');
    expect(months).not.toContain('2026-09');
    expect(months[0]).toBe('2026-10');
  });

  it('limita la ventana a 12 meses desde hoy', () => {
    const months = listSelectableMonths('2026-10-03', '2026-10-10');
    expect(months.every(m => m <= '2027-09')).toBe(true);
  });

  it('sin fecha de inicio válida no ofrece meses', () => {
    expect(listSelectableMonths('2026-10-03', '')).toEqual([]);
    expect(listSelectableMonths('2026-10-03', 'abc')).toEqual([]);
  });
});

describe('shiftToMonth', () => {
  it('mueve el ciclo al mes destino conservando los días (3–30 abril → mayo)', () => {
    expect(shiftToMonth('2026-04-03', '2026-04-30', '2026-05')).toEqual({
      startDate: '2026-05-03',
      endDate: '2026-05-30',
    });
  });

  it('recorta al último día del mes si el día no existe (30 → febrero)', () => {
    expect(shiftToMonth('2026-01-03', '2026-01-30', '2026-02')).toEqual({
      startDate: '2026-02-03',
      endDate: '2026-02-28',
    });
  });

  it('respeta febrero bisiesto', () => {
    expect(shiftToMonth('2027-12-29', '2027-12-31', '2028-02')).toEqual({
      startDate: '2028-02-29',
      endDate: '2028-02-29',
    });
  });

  it('mantiene la misma duración en meses (ciclo que cruza de mes)', () => {
    expect(shiftToMonth('2026-04-20', '2026-05-10', '2026-06')).toEqual({
      startDate: '2026-06-20',
      endDate: '2026-07-10',
    });
  });

  it('cruza de año', () => {
    expect(shiftToMonth('2026-11-03', '2026-11-30', '2027-01')).toEqual({
      startDate: '2027-01-03',
      endDate: '2027-01-30',
    });
  });

  it('una clase de un solo día se mueve entera', () => {
    expect(shiftToMonth('2026-04-15', '2026-04-15', '2026-06')).toEqual({
      startDate: '2026-06-15',
      endDate: '2026-06-15',
    });
  });
});

describe('autoPublishDate', () => {
  it('es 14 días antes del inicio', () => {
    expect(autoPublishDate('2026-05-03')).toBe('2026-04-19');
  });

  it('cruza de mes y de año', () => {
    expect(autoPublishDate('2027-01-05')).toBe('2026-12-22');
  });
});

describe('parseSeriesMonths', () => {
  const today = '2026-10-03';
  const start = '2026-10-10';

  it('acepta un JSON válido y lo devuelve ordenado y sin duplicados', () => {
    expect(parseSeriesMonths('["2027-01","2026-11","2026-11"]', today, start)).toEqual(['2026-11', '2027-01']);
  });

  it('vacío, nulo o inválido → sin copias', () => {
    expect(parseSeriesMonths(null, today, start)).toEqual([]);
    expect(parseSeriesMonths('', today, start)).toEqual([]);
    expect(parseSeriesMonths('no-json', today, start)).toEqual([]);
    expect(parseSeriesMonths('{"a":1}', today, start)).toEqual([]);
  });

  it('descarta formatos incorrectos, el mes inicial y meses pasados', () => {
    expect(parseSeriesMonths('["2026-10","2026-09","2026-13","hola","2026-11"]', today, start)).toEqual(['2026-11']);
  });

  it('descarta meses fuera de la ventana de 12 meses', () => {
    expect(parseSeriesMonths('["2026-11","2028-05"]', today, start)).toEqual(['2026-11']);
  });

  it('limita a 11 meses', () => {
    const all = listSelectableMonths(today, start);
    expect(parseSeriesMonths(JSON.stringify([...all, '2027-10']), today, start)).toHaveLength(MAX_SERIES_MONTHS);
  });

  it('ignora valores que no son texto', () => {
    expect(parseSeriesMonths('[1,null,"2026-11"]', today, start)).toEqual(['2026-11']);
  });
});

describe('monthLabel', () => {
  it('devuelve el mes en español con mayúscula y el año', () => {
    expect(monthLabel('2026-05')).toBe('Mayo 2026');
    expect(monthLabel('2027-01')).toBe('Enero 2027');
  });

  it('versión corta sin año', () => {
    expect(monthLabel('2026-05', { short: true })).toBe('May');
    expect(monthLabel('2026-09', { short: true })).toBe('Sep');
  });
});
