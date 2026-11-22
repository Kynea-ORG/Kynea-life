import { describe, it, expect } from 'vitest';
import {
  buildStudentToTeacherMessage,
  buildTeacherToStudentMessage,
  buildWhatsAppChatUrl,
  hasValidBookingContact,
  isValidInstagramContact,
  isValidWhatsAppContact,
  resolveStudentChannels,
  resolveTeacherChannels,
  validateBookingInstagram,
  validateBookingWhatsApp,
} from './contact';

describe('buildWhatsAppChatUrl', () => {
  it('limpia formato y antepone 51 a celulares peruanos de 9 dígitos', () => {
    expect(buildWhatsAppChatUrl('987 654 321')).toBe('https://wa.me/51987654321');
    expect(buildWhatsAppChatUrl('+51 987-654-321', 'Hola profe')).toBe(
      'https://wa.me/51987654321?text=Hola%20profe',
    );
  });

  it('devuelve null para teléfonos vacíos o muy cortos', () => {
    expect(buildWhatsAppChatUrl('')).toBeNull();
    expect(buildWhatsAppChatUrl('12345')).toBeNull();
    expect(buildWhatsAppChatUrl(null)).toBeNull();
  });
});

describe('resolveTeacherChannels', () => {
  it('respeta contactMode y showWhatsapp', () => {
    const waOnly = resolveTeacherChannels({
      contactMode: 'whatsapp',
      whatsapp: '+51 999 111 222',
      instagram: '@profe',
      showWhatsapp: true,
    });
    expect(waOnly.whatsappUrl).toBe('https://wa.me/51999111222');
    expect(waOnly.instagramUrl).toBeNull();

    const igOnly = resolveTeacherChannels({
      contactMode: 'instagram',
      whatsapp: '+51 999 111 222',
      instagram: '@profe',
      showWhatsapp: true,
    });
    expect(igOnly.whatsappUrl).toBeNull();
    expect(igOnly.instagramUrl).toBe('https://instagram.com/profe');
    expect(igOnly.instagramHandle).toBe('@profe');

    const both = resolveTeacherChannels({
      contactMode: 'both',
      whatsapp: '+51 999 111 222',
      instagram: '@profe',
      showWhatsapp: false,
    });
    expect(both.whatsappUrl).toBeNull();
    expect(both.instagramUrl).toBe('https://instagram.com/profe');
  });

  it('hace fallback al otro canal si el elegido falta', () => {
    const fallback = resolveTeacherChannels({
      contactMode: 'whatsapp',
      whatsapp: null,
      instagram: '@profe',
    });
    expect(fallback.instagramUrl).toBe('https://instagram.com/profe');
  });
});

describe('resolveStudentChannels & mensajes', () => {
  it('construye enlaces directos y textos prellenados', () => {
    const ch = resolveStudentChannels({ whatsapp: '999888777', instagram: 'https://instagram.com/valebaila' });
    expect(ch.whatsappUrl).toBe('https://wa.me/51999888777');
    expect(ch.instagramUrl).toBe('https://instagram.com/valebaila');
    expect(ch.instagramHandle).toBe('@valebaila');

    expect(buildStudentToTeacherMessage({ teacherName: 'Carlos Pérez', classTitle: 'Salsa', seats: 2 })).toContain('Hola Carlos');
    expect(buildTeacherToStudentMessage({ studentName: 'Valentina Cruz', classTitle: 'Salsa' })).toContain('coordinar el pago y confirmar tu cupo');
    const confirmedMsg = buildTeacherToStudentMessage({ studentName: 'Valentina Cruz', classTitle: 'Salsa', confirmed: true });
    expect(confirmedMsg).toBe('Hola Valentina, te escribo por tu reserva en "Salsa" por Kynea.');
    expect(confirmedMsg).not.toContain('coordinar el pago');
  });
});

describe('validadores de contacto para reservas', () => {
  it('valida WhatsApp con al menos 7 dígitos y rechaza incompletos', () => {
    expect(isValidWhatsAppContact('999888777')).toBe(true);
    expect(isValidWhatsAppContact('+51 999 888 777')).toBe(true);
    expect(isValidWhatsAppContact('123456')).toBe(false);
    expect(isValidWhatsAppContact('   ')).toBe(false);
    expect(isValidWhatsAppContact(null)).toBe(false);
  });

  it('valida Instagram con al menos 1 carácter útil además de @ o espacios', () => {
    expect(isValidInstagramContact('@soyalumna')).toBe(true);
    expect(isValidInstagramContact('https://instagram.com/soyalumna/')).toBe(true);
    expect(isValidInstagramContact('@')).toBe(false);
    expect(isValidInstagramContact('  @  ')).toBe(false);
    expect(isValidInstagramContact('')).toBe(false);
  });

  it('hasValidBookingContact requiere al menos uno de los dos válido', () => {
    expect(hasValidBookingContact('', '')).toBe(false);
    expect(hasValidBookingContact('123', '@')).toBe(false);
    expect(hasValidBookingContact('999888777', '@')).toBe(true);
    expect(hasValidBookingContact('123', '@soyalumna')).toBe(true);
  });

  it('validateBookingWhatsApp exige 7–15 dígitos locales y rechaza enlaces, letras y espacios', () => {
    expect(validateBookingWhatsApp('999888777')).toEqual({ valid: true, value: '999888777', error: null });
    expect(validateBookingWhatsApp('1234567')).toEqual({ valid: true, value: '1234567', error: null });
    expect(validateBookingWhatsApp('123456789012345')).toEqual({ valid: true, value: '123456789012345', error: null });

    expect(validateBookingWhatsApp('')).toMatchObject({ valid: false });
    expect(validateBookingWhatsApp('123456')).toMatchObject({ valid: false, error: expect.stringMatching(/7 dígitos/i) });
    expect(validateBookingWhatsApp('1234567890123456')).toMatchObject({ valid: false, error: expect.stringMatching(/15 dígitos/i) });

    for (const bad of ['https://wa.me/51999888777', 'wa.me/51999888777', 'www.ejemplo.com', '999 888 777', '+51999888777', '999abc888']) {
      expect(validateBookingWhatsApp(bad), bad).toEqual({
        valid: false,
        value: '',
        error: 'Ingresa solo dígitos de tu número local, sin enlaces ni espacios.',
      });
    }
  });

  it('validateBookingInstagram acepta usuarios válidos y rechaza enlaces, espacios y caracteres inválidos', () => {
    expect(validateBookingInstagram('valedance')).toEqual({ valid: true, value: 'valedance', error: null });
    expect(validateBookingInstagram('@vale_dance.01')).toEqual({ valid: true, value: 'vale_dance.01', error: null });

    expect(validateBookingInstagram('')).toMatchObject({ valid: false });
    for (const bad of [
      'https://instagram.com/valedance',
      'http://www.instagram.com/valedance',
      'instagram.com/valedance',
      'valedance.com',
      'vale/dance',
      'vale?ref=1',
      'vale#top',
      'vale dance',
      'vale..dance',
      '@@valedance',
      '@',
      'a'.repeat(31),
    ]) {
      expect(validateBookingInstagram(bad), bad).toEqual({
        valid: false,
        value: '',
        error: 'Ingresa solo tu usuario de Instagram (ej. tuusuario), sin enlaces ni espacios.',
      });
    }
  });
});
