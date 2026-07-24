import { describe, it, expect } from 'vitest';
import { validateStep, type OnboardingForm } from './validation';

// ─── Helpers ────────────────────────────────────────────────────────────────

function validForm(overrides: Partial<OnboardingForm> = {}): OnboardingForm {
  return {
    publicName: 'Ana Pérez',
    nationality: 'Perú',
    instagram: '',
    styles: ['Salsa'],
    ...overrides,
  };
}

function validContact(overrides: Partial<{ waNumber: string }> = {}): { waNumber: string } {
  return { waNumber: '999999999', ...overrides };
}

// ─── Step 0: Datos públicos ─────────────────────────────────────────────────

describe('validateStep — step 0 (Datos públicos)', () => {
  it('passes when publicName and nationality are set', () => {
    const result = validateStep(0, validForm(), validContact());
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('rejects empty publicName', () => {
    const result = validateStep(0, validForm({ publicName: '' }), validContact());
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.field === 'publicName')).toBe(true);
  });

  it('rejects whitespace-only publicName', () => {
    const result = validateStep(0, validForm({ publicName: '   ' }), validContact());
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.field === 'publicName')).toBe(true);
  });

  it('rejects empty nationality', () => {
    const result = validateStep(0, validForm({ nationality: '' }), validContact());
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.field === 'nationality')).toBe(true);
  });

  it('rejects whitespace-only nationality', () => {
    const result = validateStep(0, validForm({ nationality: '   ' }), validContact());
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.field === 'nationality')).toBe(true);
  });
});

// ─── Step 1: Contacto (ported inline rule) ──────────────────────────────────

describe('validateStep — step 1 (Contacto)', () => {
  it('rejects when both waNumber and instagram are empty', () => {
    const result = validateStep(1, validForm({ instagram: '' }), validContact({ waNumber: '' }));
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      { field: 'whatsapp', message: 'Ingresa al menos tu WhatsApp o Instagram para que los alumnos puedan contactarte.' },
    ]);
  });

  it('passes when only waNumber is set', () => {
    const result = validateStep(1, validForm({ instagram: '' }), validContact({ waNumber: '999999999' }));
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('passes when only instagram is set', () => {
    const result = validateStep(1, validForm({ instagram: '@tuperfil' }), validContact({ waNumber: '' }));
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('passes when both are set', () => {
    const result = validateStep(1, validForm({ instagram: '@tuperfil' }), validContact({ waNumber: '999999999' }));
    expect(result).toEqual({ ok: true, errors: [] });
  });
});

// ─── Step 2: Especialidad ───────────────────────────────────────────────────

describe('validateStep — step 2 (Especialidad)', () => {
  it('rejects an empty styles array', () => {
    const result = validateStep(2, validForm({ styles: [] }), validContact());
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      { field: 'styles', message: 'Selecciona al menos un estilo que enseñas.' },
    ]);
  });

  it('passes when at least one style is selected', () => {
    const result = validateStep(2, validForm({ styles: ['Bachata'] }), validContact());
    expect(result).toEqual({ ok: true, errors: [] });
  });
});

// ─── Step 3 / unknown steps ──────────────────────────────────────────────────

describe('validateStep — step 3 / unknown steps', () => {
  it('always passes for step 3 regardless of form content', () => {
    const result = validateStep(3, validForm({ publicName: '', nationality: '', styles: [] }), validContact({ waNumber: '' }));
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('always passes for an out-of-range step', () => {
    const result = validateStep(99, validForm({ publicName: '' }), validContact());
    expect(result).toEqual({ ok: true, errors: [] });
  });
});
