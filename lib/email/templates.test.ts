import { describe, it, expect } from 'vitest';
import { renderEmail } from './templates';

const payload = {
  bookingId: 'b1', classTitle: 'Taller <b>Bachata</b>', seats: 2, price: 80, currency: 'PEN', paymentMethod: 'pay_at_venue',
  date: '2026-11-23', startTime: '19:00', endTime: '20:30', venueName: 'Estudio Sol', address: 'Av. 1', reference: 'Frente al parque',
  mapsUrl: 'https://maps.example/x', footwear: ['Zapatillas'], clothing: 'Ropa cómoda', toBring: ['Agua'], cancellationPolicy: 'flexible',
  teacherName: 'Carlos Pérez', studentName: 'Valentina', note: 'Tengo la rodilla sensible',
};
const opts = { siteUrl: 'https://kynea.dance' };

describe('renderEmail', () => {
  it('confirmación al alumno: asunto, fecha, lugar, recomendaciones y enlace a Mis reservas', () => {
    const e = renderEmail('booking_confirmed', payload, opts);
    expect(e.subject).toContain('Tu cupo');
    for (const text of [e.html, e.text]) {
      expect(text).toMatch(/lunes,? 23 de noviembre/i);
      expect(text).toContain('19:00');
      expect(text).toContain('Estudio Sol');
      expect(text).toContain('Frente al parque');
      expect(text).toContain('Zapatillas');
      expect(text).toContain('https://kynea.dance/dashboard/alumno/reservas');
    }
    expect(e.html).toContain('https://maps.example/x');
  });

  it('escapa el HTML de los textos que escribe el usuario', () => {
    const e = renderEmail('booking_confirmed', payload, opts);
    expect(e.html).not.toContain('<b>Bachata</b>');
    expect(e.html).toContain('&lt;b&gt;Bachata&lt;/b&gt;');
  });

  it('aviso al profesor: nombre del alumno, cupos, mensaje y enlace al panel', () => {
    const e = renderEmail('booking_received', payload, opts);
    expect(e.subject).toContain('Valentina');
    expect(e.html).toContain('Tengo la rodilla sensible');
    expect(e.text).toContain('2 cupos');
    expect(e.html).toContain('https://kynea.dance/dashboard/reservas');
  });

  it('recordatorio: "mañana" o "hoy" en el asunto', () => {
    expect(renderEmail('booking_reminder', { ...payload, daysAway: 1 }, opts).subject).toMatch(/mañana/i);
    expect(renderEmail('booking_reminder', { ...payload, daysAway: 0 }, opts).subject).toMatch(/hoy/i);
  });

  it('cancelación al alumno: avisa, explica el motivo y lo lleva a buscar otra clase', () => {
    const e = renderEmail('booking_cancelled', { ...payload, reason: 'Fecha cancelada por el profesor' }, opts);
    expect(e.subject).toMatch(/cancel/i);
    expect(e.html).toContain('Fecha cancelada por el profesor');
    expect(e.text).toContain('https://kynea.dance/clases');
  });

  it('no muestra motivos técnicos internos', () => {
    const e = renderEmail('booking_cancelled', { ...payload, reason: 'session_cancelled' }, opts);
    expect(e.html).not.toContain('session_cancelled');
  });

  it('cancelación al profesor: dice quién canceló y que el cupo quedó libre', () => {
    const e = renderEmail('booking_cancelled_by_student', payload, opts);
    expect(e.subject).toContain('Valentina');
    expect(e.text).toMatch(/cupo/i);
    expect(e.html).toContain('https://kynea.dance/dashboard/reservas');
  });

  it('una plantilla desconocida lanza error', () => {
    expect(() => renderEmail('nope', payload, opts)).toThrow(/plantilla/i);
  });
});
