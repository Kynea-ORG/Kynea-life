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
      expect(text).toContain('https://kynea.dance/dashboard/mis-reservas');
    }
    expect(e.html).toContain('https://maps.example/x');
  });

  it('en clases Online muestra solo el monto sin pago presencial y omite enlace de Maps', () => {
    const e = renderEmail('booking_confirmed', { ...payload, modality: 'Online' }, opts);
    expect(e.text).toContain('PEN 80');
    expect(e.text).not.toContain('en la clase');
    expect(e.text).not.toContain('coordinas el pago');
    expect(e.html).not.toContain('Cómo llegar');
  });

  it('bloquea esquemas inseguros en mapsUrl (ej. javascript:)', () => {
    const e = renderEmail('booking_confirmed', { ...payload, mapsUrl: 'javascript:alert(1)' }, opts);
    expect(e.html).not.toContain('javascript:');
    expect(e.html).not.toContain('Cómo llegar');
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

  it('recordatorio: "mañana" o "hoy" en el asunto y muestra solo el monto sin "en la clase"', () => {
    const tomorrow = renderEmail('booking_reminder', { ...payload, daysAway: 1 }, opts);
    expect(tomorrow.subject).toMatch(/mañana/i);
    expect(tomorrow.text).toContain('PEN 80');
    expect(tomorrow.text).not.toContain('en la clase');
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

  it('booking_pending: muestra estado pendiente, nota de pago y CTA directo a WhatsApp/Instagram del profesor', () => {
    const e = renderEmail('booking_pending', {
      ...payload,
      contactMode: 'both',
      teacherWhatsapp: '+51 999 111 222',
      teacherInstagram: '@carlosperez',
      teacherShowWhatsapp: true,
    }, opts);
    expect(e.subject).toMatch(/pendiente de confirmación/i);
    expect(e.html).toContain('https://wa.me/51999111222');
    expect(e.html).toContain('https://instagram.com/carlosperez');
    expect(e.text).toContain('Pendiente de confirmación');
    expect(e.text).toContain('(coordinas el pago directo con el profesor)');
  });

  it('booking_approved: confirma la reserva al alumno con solo el monto sin "en la clase"', () => {
    const e = renderEmail('booking_approved', payload, opts);
    expect(e.subject).toMatch(/reserva confirmada/i);
    expect(e.html).toContain('Carlos Pérez confirmó');
    expect(e.html).toContain('https://kynea.dance/dashboard/mis-reservas');
    expect(e.text).toContain('PEN 80');
    expect(e.text).not.toContain('en la clase');
  });

  it('booking_received pendiente: incluye contacto del alumno y botón 1-tap hacia /reservas/accion', () => {
    const e = renderEmail('booking_received', {
      ...payload,
      status: 'pending_confirmation',
      studentWhatsapp: '+51 987 654 321',
      studentInstagram: 'valedance',
      actionToken: 'tok_abc123',
    }, opts);
    expect(e.subject).toMatch(/por confirmar/i);
    expect(e.html).toContain('https://kynea.dance/reservas/accion?t=tok_abc123');
    expect(e.html).toContain('https://wa.me/51987654321');
    expect(e.html).toContain('https://instagram.com/valedance');
  });

  it('teacher_pending_reminder: agrupa alumnos pendientes con botones 1-tap en aviso pre y post clase', () => {
    const pre = renderEmail('teacher_pending_reminder', {
      ...payload,
      kind: 'pre_class',
      reminderHoursBefore: 12,
      items: [
        { studentName: 'Valentina', seats: 2, price: 80, currency: 'PEN', studentWhatsapp: '987654321', actionToken: 't1' },
        { studentName: 'Mateo', seats: 1, price: 40, currency: 'PEN', studentInstagram: '@mateo', actionToken: 't2' },
      ],
    }, opts);
    expect(pre.subject).toContain('2 reservas por confirmar');
    expect(pre.html).toContain('https://kynea.dance/reservas/accion?t=t1');
    expect(pre.html).toContain('https://kynea.dance/reservas/accion?t=t2');
    expect(pre.html).toContain('https://wa.me/51987654321');
    expect(pre.html).toContain('https://instagram.com/mateo');

    const post = renderEmail('teacher_pending_reminder', {
      ...payload,
      kind: 'post_class',
      items: [{ studentName: 'Valentina', seats: 1, price: 40, currency: 'PEN', actionToken: 't1' }],
    }, opts);
    expect(post.subject).toMatch(/último aviso/i);
    expect(post.html).toContain('48 horas');
  });
});
