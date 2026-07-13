import { describe, it, expect } from 'vitest';
import {
  MAX_FULL_DESC,
  validateForPublish,
  validateForDraft,
  formDataToValidationInput,
  dbRowToValidationInput,
  publishError,
  parsePublishError,
  profileFixHref,
  type ClassValidationInput,
} from './validation';
import type { DbClassRow, DbClassSchedule } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function validInput(overrides: Partial<ClassValidationInput> = {}): ClassValidationInput {
  return {
    status: 'published',
    type: 'clase',
    title: 'Salsa Básico desde cero',
    style: 'Salsa',
    level: 'Principiante',
    fullDesc: 'Una clase para aprender los fundamentos.',
    recurrence: 'mensual',
    startDate: isoDaysFromToday(1),
    endDate: isoDaysFromToday(30),
    priceType: 'Mensual',
    price: '50',
    offerPrice: '',
    modality: 'Presencial',
    city: 'Lima',
    district: 'Miraflores',
    address: 'Av. Benavides 1234',
    accessLink: '',
    slots: [{ days: ['Lunes'], startTime: '19:00', endTime: '20:30' }],
    ...overrides,
  };
}

// ─── validateForPublish ───────────────────────────────────────────────────

describe('validateForPublish — happy path', () => {
  it('passes when all required fields and business rules are satisfied (Presencial/mensual)', () => {
    const result = validateForPublish(validInput());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('passes for a valid Online class with accessLink', () => {
    const result = validateForPublish(
      validInput({ modality: 'Online', accessLink: 'https://zoom.us/j/123', city: '', district: '', address: '' })
    );
    expect(result.ok).toBe(true);
  });

  it('passes for Gratis price type with no price required', () => {
    const result = validateForPublish(validInput({ priceType: 'Gratis', price: '' }));
    expect(result.ok).toBe(true);
  });
});

describe('validateForPublish — required fields', () => {
  it('rejects empty title', () => {
    const result = validateForPublish(validInput({ title: '' }));
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
  });

  it('rejects whitespace-only title', () => {
    const result = validateForPublish(validInput({ title: '   ' }));
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
  });

  it('rejects empty style', () => {
    const result = validateForPublish(validInput({ style: '' }));
    expect(result.errors.some(e => e.field === 'style')).toBe(true);
  });

  it('rejects empty level', () => {
    const result = validateForPublish(validInput({ level: '' }));
    expect(result.errors.some(e => e.field === 'level')).toBe(true);
  });
});

describe('validateForPublish — schedule', () => {
  it('rejects zero schedule slots', () => {
    const result = validateForPublish(validInput({ slots: [] }));
    expect(result.errors.some(e => e.field === 'schedule')).toBe(true);
  });

  it('rejects mensual recurrence with no days selected', () => {
    const result = validateForPublish(
      validInput({ recurrence: 'mensual', slots: [{ days: [], startTime: '19:00', endTime: '20:00' }] })
    );
    expect(result.errors.some(e => e.field === 'schedule')).toBe(true);
  });

  it('accepts unica recurrence with no days selected (implicit single date)', () => {
    const result = validateForPublish(
      validInput({ recurrence: 'unica', slots: [{ days: [], startTime: '19:00', endTime: '20:00' }] })
    );
    expect(result.errors.some(e => e.field === 'schedule')).toBe(false);
  });

  it('rejects endTime not later than startTime', () => {
    const result = validateForPublish(
      validInput({ slots: [{ days: ['Lunes'], startTime: '19:00', endTime: '18:00' }] })
    );
    expect(result.errors.some(e => e.field === 'schedule')).toBe(true);
  });

  it('rejects endTime equal to startTime', () => {
    const result = validateForPublish(
      validInput({ slots: [{ days: ['Lunes'], startTime: '19:00', endTime: '19:00' }] })
    );
    expect(result.errors.some(e => e.field === 'schedule')).toBe(true);
  });
});

describe('validateForPublish — dates', () => {
  it('rejects a startDate in the past', () => {
    const result = validateForPublish(validInput({ startDate: isoDaysFromToday(-1) }));
    expect(result.errors.some(e => e.field === 'startDate')).toBe(true);
  });

  it('accepts a startDate of today', () => {
    const result = validateForPublish(validInput({ startDate: isoDaysFromToday(0) }));
    expect(result.errors.some(e => e.field === 'startDate')).toBe(false);
  });

  it('rejects missing startDate', () => {
    const result = validateForPublish(validInput({ startDate: '' }));
    expect(result.errors.some(e => e.field === 'startDate')).toBe(true);
  });

  it('rejects endDate earlier than startDate for mensual', () => {
    const result = validateForPublish(
      validInput({ recurrence: 'mensual', startDate: isoDaysFromToday(10), endDate: isoDaysFromToday(5) })
    );
    expect(result.errors.some(e => e.field === 'endDate')).toBe(true);
  });

  it('accepts endDate equal to startDate for mensual', () => {
    const result = validateForPublish(
      validInput({ recurrence: 'mensual', startDate: isoDaysFromToday(5), endDate: isoDaysFromToday(5) })
    );
    expect(result.errors.some(e => e.field === 'endDate')).toBe(false);
  });
});

describe('validateForPublish — price', () => {
  it('rejects empty price when priceType is not Gratis', () => {
    const result = validateForPublish(validInput({ priceType: 'Mensual', price: '' }));
    expect(result.errors.some(e => e.field === 'price')).toBe(true);
  });

  it('rejects zero price when priceType is not Gratis (no silent coercion)', () => {
    const result = validateForPublish(validInput({ priceType: 'Mensual', price: '0' }));
    expect(result.errors.some(e => e.field === 'price')).toBe(true);
  });

  it('rejects non-numeric price', () => {
    const result = validateForPublish(validInput({ priceType: 'Mensual', price: 'abc' }));
    expect(result.errors.some(e => e.field === 'price')).toBe(true);
  });

  it('rejects offerPrice not less than price', () => {
    const result = validateForPublish(validInput({ price: '50', offerPrice: '60' }));
    expect(result.errors.some(e => e.field === 'price')).toBe(true);
  });

  it('rejects offerPrice equal to price', () => {
    const result = validateForPublish(validInput({ price: '50', offerPrice: '50' }));
    expect(result.errors.some(e => e.field === 'price')).toBe(true);
  });

  it('accepts offerPrice less than price', () => {
    const result = validateForPublish(validInput({ price: '50', offerPrice: '40' }));
    expect(result.errors.some(e => e.field === 'price')).toBe(false);
  });
});

describe('validateForPublish — fullDesc length', () => {
  it('accepts fullDesc at the max length', () => {
    const result = validateForPublish(validInput({ fullDesc: 'a'.repeat(MAX_FULL_DESC) }));
    expect(result.errors.some(e => e.field === 'fullDesc')).toBe(false);
  });

  it('rejects fullDesc exceeding the max length', () => {
    const result = validateForPublish(validInput({ fullDesc: 'a'.repeat(MAX_FULL_DESC + 1) }));
    expect(result.errors.some(e => e.field === 'fullDesc')).toBe(true);
  });
});

describe('validateForPublish — modality-conditional fields', () => {
  it('rejects Presencial with missing address', () => {
    const result = validateForPublish(validInput({ modality: 'Presencial', address: '' }));
    expect(result.errors.some(e => e.field === 'address')).toBe(true);
  });

  it('rejects Presencial with missing city', () => {
    const result = validateForPublish(validInput({ modality: 'Presencial', city: '' }));
    expect(result.errors.some(e => e.field === 'city')).toBe(true);
  });

  it('rejects Presencial with missing district', () => {
    const result = validateForPublish(validInput({ modality: 'Presencial', district: '' }));
    expect(result.errors.some(e => e.field === 'district')).toBe(true);
  });

  it('rejects Online with missing accessLink', () => {
    const result = validateForPublish(
      validInput({ modality: 'Online', accessLink: '', city: '', district: '', address: '' })
    );
    expect(result.errors.some(e => e.field === 'accessLink')).toBe(true);
  });

  it('does not require accessLink for Presencial', () => {
    const result = validateForPublish(validInput({ modality: 'Presencial', accessLink: '' }));
    expect(result.errors.some(e => e.field === 'accessLink')).toBe(false);
  });

  it('does not require address/city/district for Online', () => {
    const result = validateForPublish(
      validInput({ modality: 'Online', accessLink: 'https://zoom.us/j/1', city: '', district: '', address: '' })
    );
    expect(result.errors.some(e => e.field === 'address' || e.field === 'city' || e.field === 'district')).toBe(false);
  });
});

// ─── validateForDraft ───────────────────────────────────────────────────────

describe('validateForDraft', () => {
  it('is always ok, regardless of input completeness', () => {
    expect(validateForDraft({} as ClassValidationInput)).toEqual({ ok: true, errors: [] });
    expect(validateForDraft(validInput({ title: '' }))).toEqual({ ok: true, errors: [] });
  });
});

// ─── formDataToValidationInput ──────────────────────────────────────────────

describe('formDataToValidationInput', () => {
  it('maps FormData fields into a ClassValidationInput', () => {
    const fd = new FormData();
    fd.set('status', 'published');
    fd.set('type', 'clase');
    fd.set('title', 'Bachata Intermedio');
    fd.set('style', 'Bachata');
    fd.set('level', 'Intermedio');
    fd.set('fullDesc', 'Descripción');
    fd.set('recurrence', 'mensual');
    fd.set('startDate', '2026-08-01');
    fd.set('endDate', '2026-08-31');
    fd.set('priceType', 'Mensual');
    fd.set('price', '80');
    fd.set('offerPrice', '');
    fd.set('modality', 'Presencial');
    fd.set('city', 'Lima');
    fd.set('district', 'Barranco');
    fd.set('address', 'Calle Test 1');
    fd.set('accessLink', '');
    fd.set('timeSlots', JSON.stringify([{ days: ['Martes'], startTime: '18:00', endTime: '19:00' }]));

    const input = formDataToValidationInput(fd);

    expect(input.title).toBe('Bachata Intermedio');
    expect(input.style).toBe('Bachata');
    expect(input.recurrence).toBe('mensual');
    expect(input.slots).toEqual([{ days: ['Martes'], startTime: '18:00', endTime: '19:00' }]);
    expect(input.price).toBe('80');
  });

  it('defaults slots to an empty array when timeSlots is absent', () => {
    const fd = new FormData();
    const input = formDataToValidationInput(fd);
    expect(input.slots).toEqual([]);
  });

  it('defaults priceType to "Gratis" when the key is genuinely absent from FormData', () => {
    // Guards against a regression where an absent priceType key silently
    // falls through to a different default (or undefined) as more callers
    // reuse this adapter — documented behavior, not incidental.
    const fd = new FormData();
    const input = formDataToValidationInput(fd);
    expect(input.priceType).toBe('Gratis');
  });
});

// ─── profileFixHref ──────────────────────────────────────────────────────────

describe('profileFixHref', () => {
  it('builds a single-channel deep link', () => {
    expect(profileFixHref(['whatsapp'])).toBe('/dashboard/perfil?missing=whatsapp#contacto');
  });

  it('builds a multi-channel deep link', () => {
    expect(profileFixHref(['whatsapp', 'instagram'])).toBe('/dashboard/perfil?missing=whatsapp,instagram#contacto');
  });

  it('falls back to the bare anchor when missing is empty (defensive)', () => {
    expect(profileFixHref([])).toBe('/dashboard/perfil#contacto');
  });
});

// ─── dbRowToValidationInput ──────────────────────────────────────────────────

function makeDbRow(overrides: Partial<DbClassRow> = {}): DbClassRow {
  return {
    id: 'class-1',
    type: 'clase',
    title: 'Salsa Avanzado',
    slug: null,
    status: 'draft',
    teacher_id: 'teacher-1',
    level_id: 1,
    venue_id: 'venue-1',
    short_description: null,
    full_description: 'Full desc',
    what_you_learn: null,
    for_whom: null,
    requirements: null,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    price_type: 'Mensual',
    price: 60,
    offer_price: null,
    currency: 'PEN',
    max_spots: null,
    available_spots: null,
    is_trial_free: null,
    modality: 'Presencial',
    platform: null,
    access_link: null,
    cover_image: null,
    gallery: null,
    video_url: null,
    footwear: null,
    clothing: null,
    to_bring: null,
    age_group: null,
    contact_mode: 'whatsapp',
    views_count: null,
    contacts_count: null,
    saved_count: null,
    created_at: null,
    updated_at: null,
    published_at: null,
    level: { id: 1, name: 'Avanzado' },
    class_styles: [{ style_id: 1, is_main: true, dance_styles: { id: 1, name: 'Salsa' } }],
    class_schedules: [],
    venue: {
      name: 'Estudio X',
      address: 'Av. Test 99',
      reference: null,
      maps_url: null,
      lat: null,
      lng: null,
      district: { name: 'Miraflores', city: 'Lima' },
    },
    teacher: null,
    ...overrides,
  };
}

describe('dbRowToValidationInput', () => {
  it('maps a stored row + single schedule into a ClassValidationInput with recurrence "unica"', () => {
    const schedules: DbClassSchedule[] = [{ id: 's1', day_of_week: 0, start_time: '19:00', end_time: '20:00' }];
    const input = dbRowToValidationInput(makeDbRow(), schedules);

    expect(input.title).toBe('Salsa Avanzado');
    expect(input.style).toBe('Salsa');
    expect(input.level).toBe('Avanzado');
    expect(input.city).toBe('Lima');
    expect(input.district).toBe('Miraflores');
    expect(input.address).toBe('Av. Test 99');
    expect(input.recurrence).toBe('unica');
    expect(input.slots).toEqual([{ days: ['Lunes'], startTime: '19:00', endTime: '20:00' }]);
  });

  it('infers recurrence "mensual" when multiple schedules are present', () => {
    const schedules: DbClassSchedule[] = [
      { id: 's1', day_of_week: 0, start_time: '19:00', end_time: '20:00' },
      { id: 's2', day_of_week: 2, start_time: '19:00', end_time: '20:00' },
    ];
    const input = dbRowToValidationInput(makeDbRow(), schedules);
    expect(input.recurrence).toBe('mensual');
    expect(input.slots[0].days).toEqual(['Lunes', 'Miércoles']);
  });

  it('produces a valid input that passes validateForPublish when the row is complete', () => {
    const schedules: DbClassSchedule[] = [
      { id: 's1', day_of_week: 0, start_time: '19:00', end_time: '20:00' },
      { id: 's2', day_of_week: 2, start_time: '19:00', end_time: '20:00' },
    ];
    const row = makeDbRow({ start_date: isoDaysFromToday(1), end_date: isoDaysFromToday(30) });
    const input = dbRowToValidationInput(row, schedules);
    const result = validateForPublish(input);
    expect(result.ok).toBe(true);
  });

  it('produces an input that fails validateForPublish when a required field is missing (e.g. no price)', () => {
    const row = makeDbRow({ price: 0, price_type: 'Mensual', start_date: isoDaysFromToday(1) });
    const input = dbRowToValidationInput(row, []);
    const result = validateForPublish(input);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.field === 'price')).toBe(true);
  });
});

// ─── Error envelope ──────────────────────────────────────────────────────────

describe('publishError / parsePublishError', () => {
  it('round-trips a VALIDATION payload through the Error message', () => {
    const err = publishError({ code: 'VALIDATION', message: 'Campos incompletos', errors: [{ field: 'title', message: 'Requerido' }] });
    expect(err).toBeInstanceOf(Error);
    const parsed = parsePublishError(err);
    expect(parsed).toEqual({ code: 'VALIDATION', message: 'Campos incompletos', errors: [{ field: 'title', message: 'Requerido' }] });
  });

  it('returns null for a non-envelope error (e.g. NEXT_REDIRECT)', () => {
    const err = new Error('NEXT_REDIRECT');
    expect(parsePublishError(err)).toBeNull();
  });

  it('returns null for a raw DB error message', () => {
    const err = new Error('duplicate key value violates unique constraint');
    expect(parsePublishError(err)).toBeNull();
  });

  it('returns null for a non-Error value', () => {
    expect(parsePublishError('some string')).toBeNull();
  });
});
