import { describe, it, expect } from 'vitest';
import {
  buildStudentToTeacherMessage,
  buildTeacherToStudentMessage,
  buildWhatsAppChatUrl,
  resolveStudentChannels,
  resolveTeacherChannels,
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
    expect(buildTeacherToStudentMessage({ studentName: 'Valentina Cruz', classTitle: 'Salsa' })).toContain('Hola Valentina');
  });
});
