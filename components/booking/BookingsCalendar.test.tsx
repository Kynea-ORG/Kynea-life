// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MyBooking } from '@/lib/bookings/types';
import BookingsCalendar from './BookingsCalendar';

const base: MyBooking = {
  id: 'b1', status: 'confirmed', seats: 1, priceAmount: 0, currency: 'PEN', paymentMethod: 'free', createdAt: '2026-11-01T00:00:00Z',
  class: { id: 'c1', title: 'Bachata sensual', type: 'taller', modality: 'Presencial', cancellationPolicy: 'flexible', footwear: [], toBring: [], requirements: [], days: [], teacherName: 'Carlos', venueName: 'Estudio Sol' },
  session: { id: 's1', date: '2026-11-23', startTime: '19:00', endTime: '20:00' },
};

beforeEach(() => cleanup());

describe('BookingsCalendar', () => {
  it('muestra el mes, cuántas clases tiene y la agenda del mes', () => {
    render(<BookingsCalendar bookings={[base]} today="2026-11-13" />);
    expect(screen.getByRole('heading', { name: /noviembre/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText('1 clase este mes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /agenda de noviembre/i })).toBeInTheDocument();
    expect(screen.getAllByText('Bachata sensual').length).toBeGreaterThan(0);
  });

  it('destaca la próxima clase con su cuenta regresiva', () => {
    render(<BookingsCalendar bookings={[base]} today="2026-11-13" />);
    const next = screen.getByRole('region', { name: /tu próxima clase/i });
    expect(next).toHaveTextContent('Faltan 10 días');
    expect(next).toHaveTextContent('Bachata sensual');
  });

  it('tiene una leyenda con cada clase del mes y cuántos días tiene', () => {
    render(<BookingsCalendar bookings={[base]} today="2026-11-13" />);
    const legend = screen.getByRole('list', { name: /clases de este mes/i });
    expect(legend).toHaveTextContent('Bachata sensual');
    expect(legend).toHaveTextContent('1 día');
    expect(screen.getByText('Día elegido')).toBeInTheDocument();
  });

  it('al elegir un día muestra solo ese día y permite volver al mes completo', () => {
    const other = { ...base, id: 'b2', class: { ...base.class, id: 'c2', title: 'Salsa' }, session: { id: 's2', date: '2026-11-25', startTime: '18:00', endTime: '19:00' } };
    render(<BookingsCalendar bookings={[base, other]} today="2026-11-13" />);
    fireEvent.click(screen.getByRole('button', { name: /23 de noviembre.*Bachata sensual/i }));
    const agenda = screen.getByText(/lunes,? 23 de noviembre/i, { selector: 'h3' }).closest('section')!;
    expect(agenda).toHaveTextContent('Bachata sensual');
    expect(agenda).not.toHaveTextContent('Salsa');
    fireEvent.click(screen.getByRole('button', { name: /ver todo el mes/i }));
    expect(screen.getByRole('heading', { name: /agenda de noviembre/i }).closest('section')).toHaveTextContent('Salsa');
  });

  it('dice claramente cuando un día no tiene clases', () => {
    render(<BookingsCalendar bookings={[base]} today="2026-11-13" />);
    fireEvent.click(screen.getByRole('button', { name: /^viernes,? 20 de noviembre$/i }));
    expect(screen.getByText('No tienes clases este día.')).toBeInTheDocument();
  });

  it('navega al mes siguiente y vuelve con "Hoy"', () => {
    render(<BookingsCalendar bookings={[base]} today="2026-11-13" />);
    fireEvent.click(screen.getByRole('button', { name: /mes siguiente/i }));
    expect(screen.getByRole('heading', { name: /diciembre/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Sin clases este mes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^hoy$/i }));
    expect(screen.getByRole('heading', { name: /noviembre/i, level: 2 })).toBeInTheDocument();
  });

  it('no dibuja reservas canceladas', () => {
    render(<BookingsCalendar bookings={[{ ...base, status: 'cancelled' }]} today="2026-11-13" />);
    expect(screen.getByText('Sin clases este mes')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /tu próxima clase/i })).toBeNull();
  });
});
