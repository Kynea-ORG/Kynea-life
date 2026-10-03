import { describe, it, expect } from 'vitest';
import { seriesInfo, creationToast, formatShortDate } from './seriesLabels';

const TODAY = '2026-10-03';
const draft = { status: 'draft', seriesId: 's1', autoPublishAt: '2026-10-20' } as const;

describe('formatShortDate', () => {
  it('muestra día y mes abreviado en minúsculas', () => {
    expect(formatShortDate('2026-10-20')).toBe('20 oct');
    expect(formatShortDate('2026-05-03')).toBe('3 may');
  });
});

describe('seriesInfo', () => {
  it('una clase suelta no muestra nada', () => {
    expect(seriesInfo({ status: 'published' }, TODAY)).toEqual({});
  });

  it('una copia en borrador programada indica cuándo se publica', () => {
    expect(seriesInfo(draft, TODAY)).toEqual({ inSeries: true, scheduled: 'Se publica el 20 oct' });
  });

  it('si la fecha ya llegó, indica que se publicará en breve', () => {
    expect(seriesInfo({ ...draft, autoPublishAt: '2026-10-03' }, TODAY).scheduled).toBe('Se publica en las próximas horas');
    expect(seriesInfo({ ...draft, autoPublishAt: '2026-09-30' }, TODAY).scheduled).toBe('Se publica en las próximas horas');
  });

  it('una copia con fecha pero ya publicada a mano no muestra programación', () => {
    expect(seriesInfo({ ...draft, status: 'published' }, TODAY).scheduled).toBeUndefined();
  });

  it('indica las que se publicaron solas en los últimos 14 días', () => {
    const info = seriesInfo({ status: 'published', seriesId: 's1', autoPublishedAt: '2026-10-01T11:00:05Z' }, TODAY);
    expect(info.autoPublished).toBe('Publicada automáticamente el 1 oct');
  });

  it('no destaca las publicadas solas hace más de 14 días', () => {
    const info = seriesInfo({ status: 'published', seriesId: 's1', autoPublishedAt: '2026-09-10T11:00:00Z' }, TODAY);
    expect(info.autoPublished).toBeUndefined();
    expect(info.inSeries).toBe(true);
  });

  it('expone el error de publicación solo mientras sea borrador', () => {
    const err = 'Agrega tu WhatsApp en tu perfil para poder publicar esta clase.';
    expect(seriesInfo({ ...draft, autoPublishError: err }, TODAY).error).toBe(err);
    expect(seriesInfo({ status: 'published', seriesId: 's1', autoPublishError: err }, TODAY).error).toBeUndefined();
  });

  it('cancelar la publicación automática deja solo la marca de serie', () => {
    expect(seriesInfo({ status: 'draft', seriesId: 's1' }, TODAY)).toEqual({ inSeries: true });
  });
});

describe('creationToast', () => {
  it('sin serie: el mensaje de siempre solo si se publicó', () => {
    expect(creationToast(true, 0)).toEqual({ msg: 'Tu clase fue publicada correctamente.', durationMs: 3000 });
    expect(creationToast(false, 0)).toBeNull();
  });

  it('con copias: explica que quedan en borrador y se publican solas', () => {
    const t = creationToast(false, 3)!;
    expect(t.msg).toContain('3 copias en borrador');
    expect(t.msg).toContain('14 días antes');
    expect(t.durationMs).toBeGreaterThan(3000);
  });

  it('singular y publicada + copias', () => {
    const t = creationToast(true, 1)!;
    expect(t.msg).toContain('Tu clase fue publicada');
    expect(t.msg).toContain('1 copia en borrador');
  });
});
