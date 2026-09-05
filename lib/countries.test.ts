import { describe, it, expect } from 'vitest';
import {
  COUNTRIES,
  POPULAR_COUNTRIES,
  normalizeSearchText,
  findCountryByName,
  findCountryByCode,
  parsePhonePrefix,
  getPhonePlaceholder,
  getPhoneExample,
} from './countries';

describe('lib/countries', () => {
  it('contains all countries with valid metadata', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
    for (const c of COUNTRIES) {
      expect(c.name).toBeTruthy();
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.flag).toBeTruthy();
      expect(c.dialCode).toMatch(/^\+\d+$/);
    }
  });

  it('has popular countries prioritized', () => {
    expect(POPULAR_COUNTRIES.length).toBe(10);
    const peru = POPULAR_COUNTRIES.find(c => c.code === 'PE');
    expect(peru).toBeDefined();
    expect(peru?.name).toBe('Perú');
  });

  describe('normalizeSearchText', () => {
    it('normalizes accents and lowercase', () => {
      expect(normalizeSearchText('Perú')).toBe('peru');
      expect(normalizeSearchText('México')).toBe('mexico');
      expect(normalizeSearchText('ESPAÑA')).toBe('espana');
      expect(normalizeSearchText('  Panamá  ')).toBe('panama');
    });
  });

  describe('findCountryByName', () => {
    it('finds country with exact or accent-insensitive name', () => {
      expect(findCountryByName('Perú')?.code).toBe('PE');
      expect(findCountryByName('peru')?.code).toBe('PE');
      expect(findCountryByName('México')?.code).toBe('MX');
      expect(findCountryByName('mexico')?.code).toBe('MX');
      expect(findCountryByName('NonExistentCountry')).toBeUndefined();
      expect(findCountryByName(null)).toBeUndefined();
    });
  });

  describe('findCountryByCode', () => {
    it('finds country by ISO alpha-2 code', () => {
      expect(findCountryByCode('PE')?.name).toBe('Perú');
      expect(findCountryByCode('pe')?.name).toBe('Perú');
      expect(findCountryByCode('CO')?.name).toBe('Colombia');
      expect(findCountryByCode('XX')).toBeUndefined();
      expect(findCountryByCode(null)).toBeUndefined();
    });
  });

  describe('parsePhonePrefix', () => {
    it('parses known international prefixes correctly', () => {
      expect(parsePhonePrefix('+51999888777')).toEqual({ code: '+51', number: '999888777' });
      expect(parsePhonePrefix('+593999888777')).toEqual({ code: '+593', number: '999888777' });
      expect(parsePhonePrefix('+14155552671')).toEqual({ code: '+1', number: '4155552671' });
      expect(parsePhonePrefix('+34612345678')).toEqual({ code: '+34', number: '612345678' });
      expect(parsePhonePrefix('+5511999998888')).toEqual({ code: '+55', number: '11999998888' });
    });

    it('handles empty or blank phone number', () => {
      expect(parsePhonePrefix('')).toEqual({ code: '+51', number: '' });
      expect(parsePhonePrefix(null)).toEqual({ code: '+51', number: '' });
      expect(parsePhonePrefix(undefined)).toEqual({ code: '+51', number: '' });
    });

    it('falls back to default code when no prefix is found', () => {
      expect(parsePhonePrefix('999888777')).toEqual({ code: '+51', number: '999888777' });
    });
  });

  describe('getPhonePlaceholder & getPhoneExample', () => {
    it('returns Peru format for +51', () => {
      expect(getPhonePlaceholder('+51')).toBe('999 999 999');
      expect(getPhoneExample('+51')).toBe('Ej: 999 999 999');
    });

    it('returns US format for +1', () => {
      expect(getPhonePlaceholder('+1')).toBe('(555) 000-0000');
      expect(getPhoneExample('+1')).toBe('Ej: 555 123 4567');
    });

    it('returns Colombia format for +57', () => {
      expect(getPhonePlaceholder('+57')).toBe('300 123 4567');
      expect(getPhoneExample('+57')).toBe('Ej: 300 123 4567');
    });

    it('returns fallback for unknown code or empty', () => {
      expect(getPhonePlaceholder('+999')).toBe('Número local (sin prefijo)');
      expect(getPhoneExample('+999')).toBe('Ej: 987654321');
      expect(getPhonePlaceholder(null)).toBe('Número local (sin prefijo)');
      expect(getPhoneExample(null)).toBe('Ej: 987654321');
    });
  });
});
