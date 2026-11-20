import { describe, it, expect } from 'vitest';
import { mapSessionRow, mapMyBookingRow, mapTeacherBookingRow, sessionSpotsLeft } from './mappers';

describe('mapSessionRow / sessionSpotsLeft', () => {
  const row = { id: 's1', session_date: '2026-12-02', start_time: '19:00:00', end_time: '20:30:00', capacity: 10, taken: 4 };

  it('mapea la fila y recorta las horas a HH:MM', () => {
    expect(mapSessionRow('c1', row)).toEqual({
      id: 's1', classId: 'c1', date: '2026-12-02', startTime: '19:00', endTime: '20:30', capacity: 10, taken: 4, status: 'open',
    });
  });

  it('calcula los cupos que quedan', () => {
    expect(sessionSpotsLeft(mapSessionRow('c1', row))).toBe(6);
    expect(sessionSpotsLeft(mapSessionRow('c1', { ...row, taken: 12 }))).toBe(0);
  });

  it('capacidad null = sin límite', () => {
    expect(sessionSpotsLeft(mapSessionRow('c1', { ...row, capacity: null }))).toBeNull();
  });
});

describe('mapMyBookingRow', () => {
  const row = {
    id: 'b1', status: 'confirmed', seats: 2, price_amount: '80.00', currency: 'PEN', payment_method: 'pay_at_venue',
    created_at: '2026-11-11T10:00:00Z', cancelled_at: null,
    class: {
      id: 'c1', title: 'Taller', slug: 'taller', type: 'taller', cover_image: 'x.jpg', modality: 'Presencial',
      cancellation_policy: 'flexible', start_date: '2026-11-23', end_date: null,
      venue: { name: 'Estudio Sol', address: 'Av. 1', city: 'Lima' },
    },
    session: { id: 's1', session_date: '2026-11-23', start_time: '19:00:00', end_time: '20:00:00' },
  };

  it('mapea la reserva con su clase y su fecha', () => {
    const b = mapMyBookingRow(row)!;
    expect(b).toMatchObject({ id: 'b1', status: 'confirmed', seats: 2, priceAmount: 80, currency: 'PEN' });
    expect(b.class).toMatchObject({ title: 'Taller', coverImage: 'x.jpg', cancellationPolicy: 'flexible', venueName: 'Estudio Sol' });
    expect(b.class.toBring).toEqual([]);
    expect(b.class.footwear).toEqual([]);
    expect(b.session).toEqual({ id: 's1', date: '2026-11-23', startTime: '19:00', endTime: '20:00' });
  });

  it('trae las recomendaciones del profesor, su ficha y el horario', () => {
    const b = mapMyBookingRow({
      ...row,
      student_note: 'Soy principiante',
      class: {
        ...row.class!,
        footwear: ['Zapatillas'], clothing: 'Ropa cómoda', to_bring: ['Agua', 'Toalla'], requirements: ['Ganas'],
        venue: { name: 'Estudio Sol', address: 'Av. 1', reference: 'Frente al parque', maps_url: 'https://maps.example/x', city: 'Lima' },
        teacher: { name: 'Carlos', photo_url: 'c.jpg' },
        class_schedules: [
          { day_of_week: 4, start_time: '20:00:00', end_time: '21:00:00' },
          { day_of_week: 1, start_time: '19:00:00', end_time: '20:00:00' },
        ],
      },
    });
    expect(b.class).toMatchObject({
      footwear: ['Zapatillas'], clothing: 'Ropa cómoda', toBring: ['Agua', 'Toalla'], requirements: ['Ganas'],
      reference: 'Frente al parque', mapsUrl: 'https://maps.example/x', teacherName: 'Carlos', teacherPhoto: 'c.jpg',
      startTime: '19:00', endTime: '20:00', days: [1, 4],
    });
    expect(b.note).toBe('Soy principiante');
  });

  it('tolera una clase que ya no es visible (archivada o borrada)', () => {
    const b = mapMyBookingRow({ ...row, class: null })!;
    expect(b.class.title).toBe('Clase no disponible');
  });
});

describe('mapTeacherBookingRow', () => {
  it('mapea la fila de list_teacher_bookings', () => {
    const b = mapTeacherBookingRow({
      booking_id: 'b1', class_id: 'c1', class_title: 'Taller', session_id: null, session_date: null, start_time: null,
      capacity: 12, student_id: 'u1', student_name: 'Valentina', student_photo: 'v.jpg', student_bio: '  Bailo desde niña ',
      student_district: 'Miraflores', student_instagram: 'vale', student_since: '2026-01-01T00:00:00Z',
      student_note: ' Tengo la rodilla sensible ', student_prior: 2, seats: 1, status: 'confirmed', price_amount: 0, currency: 'PEN',
      payment_method: 'free', created_at: '2026-11-11T10:00:00Z',
    });
    expect(b).toMatchObject({
      id: 'b1', classTitle: 'Taller', studentName: 'Valentina', seats: 1, status: 'confirmed', capacity: 12,
      studentPhoto: 'v.jpg', studentBio: 'Bailo desde niña', studentDistrict: 'Miraflores', studentInstagram: 'vale',
      note: 'Tengo la rodilla sensible', priorBookings: 2,
    });
    expect(b.sessionDate).toBeUndefined();
  });
});
