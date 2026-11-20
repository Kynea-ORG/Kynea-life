// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { DanceClass } from '@/lib/types';

const { mockReserve, mockList, mockTrack } = vi.hoisted(() => ({
  mockReserve: vi.fn(), mockList: vi.fn(), mockTrack: vi.fn(),
}));
vi.mock('@/lib/bookings/actions', () => ({ reserveBooking: mockReserve, listClassSessions: mockList }));
vi.mock('@/lib/analytics', () => ({ trackBookingCreated: mockTrack }));

import BookingCta from './BookingCta';

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'c1', slug: 'taller', styleSlug: 'bachata', type: 'taller', title: 'Taller de bachata',
    priceType: 'Por clase', price: 40, currency: 'PEN', bookingMode: 'class', cancellationPolicy: 'flexible',
    startDate: '2026-11-23', timeSlots: [{ days: ['Lunes'], startTime: '19:00', endTime: '20:00' }], footwear: ['Zapatillas'], availableSpots: 5, maxSpots: 10, status: 'published',
    teacher: { id: 't1', name: 'Carlos Pérez' },
    ...over,
  } as unknown as DanceClass;
}

beforeEach(() => { cleanup(); vi.clearAllMocks(); mockList.mockResolvedValue([]); });

describe('BookingCta', () => {
  it('no muestra nada si la clase no acepta reservas', () => {
    const { container } = render(<BookingCta cls={makeClass({ bookingMode: 'none' })} isLoggedIn variant="sidebar" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra nada para organizadores externos', () => {
    const cls = makeClass({ externalOrganizer: { name: 'Min. Cultura', infoUrl: 'https://x.pe' } });
    const { container } = render(<BookingCta cls={cls} isLoggedIn variant="sidebar" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra "Sin cupos" deshabilitado cuando la clase completa está agotada', () => {
    render(<BookingCta cls={makeClass({ availableSpots: 0 })} isLoggedIn variant="sidebar" />);
    expect(screen.getByRole('button', { name: /sin cupos/i })).toBeDisabled();
  });

  it('sin sesión lleva a iniciar sesión y vuelve a la clase', () => {
    render(<BookingCta cls={makeClass()} isLoggedIn={false} variant="sidebar" />);
    const link = screen.getByRole('link', { name: /reservar/i });
    expect(link).toHaveAttribute('href', '/login?redirect=/bachata/taller/taller');
  });

  it('con sesión abre la ventana y confirma la reserva', async () => {
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b1' } });
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/un mensaje para/i), { target: { value: 'Soy principiante' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/le pagas directo a tu profesor/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));
    await waitFor(() => expect(screen.getByText(/tu cupo está listo/i)).toBeInTheDocument());
    expect(mockReserve).toHaveBeenCalledWith({ classId: 'c1', sessionId: null, seats: 1, note: 'Soy principiante' });
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ classId: 'c1', bookingMode: 'class', seats: 1, value: 40 }));
  });

  it('muestra el error de la base de datos si no se pudo reservar', async () => {
    mockReserve.mockResolvedValue({ ok: false, error: { code: 'SOLD_OUT', message: 'Ya no quedan cupos suficientes.' } });
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ya no quedan cupos suficientes.'));
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('en modo por fecha exige elegir una fecha antes de confirmar', async () => {
    mockList.mockResolvedValue([
      { id: 's1', classId: 'c1', date: '2026-12-02', startTime: '19:00', endTime: '20:30', capacity: 10, taken: 4, status: 'open' },
    ]);
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b2' } });
    render(<BookingCta cls={makeClass({ bookingMode: 'session' })} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));

    const next = screen.getByRole('button', { name: /elige una fecha/i });
    expect(next).toBeDisabled();
    fireEvent.click(await screen.findByText(/6 cupos/i));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));
    await waitFor(() => expect(mockReserve).toHaveBeenCalledWith({ classId: 'c1', sessionId: 's1', seats: 1, note: '' }));
  });
});
