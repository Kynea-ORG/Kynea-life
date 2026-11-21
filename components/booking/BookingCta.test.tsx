// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { DanceClass } from '@/lib/types';

const { mockReserve, mockList, mockTrack, mockAuthState } = vi.hoisted(() => ({
  mockReserve: vi.fn(),
  mockList: vi.fn(),
  mockTrack: vi.fn(),
  mockAuthState: {
    profile: { id: 'u1', name: 'Alumna', role: 'alumno', photo_url: null, photo_position: null, photo_zoom: null, whatsapp: '+51 999 888 777', instagram: null } as {
      id: string; name: string; role: string; photo_url: null; photo_position: null; photo_zoom: null;
      whatsapp?: string | null; instagram?: string | null;
    } | null,
    refreshProfile: vi.fn(),
  },
}));
vi.mock('@/lib/bookings/actions', () => ({ reserveBooking: mockReserve, listClassSessions: mockList }));
vi.mock('@/lib/analytics', () => ({ trackBookingCreated: mockTrack }));
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: mockAuthState.profile,
    loading: false,
    isLoggedIn: true,
    signOut: vi.fn(),
    refreshProfile: mockAuthState.refreshProfile,
  }),
}));

import BookingCta from './BookingCta';

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'c1', slug: 'taller', styleSlug: 'bachata', type: 'taller', title: 'Taller de bachata',
    priceType: 'Por clase', price: 40, currency: 'PEN', bookingMode: 'class', cancellationPolicy: 'flexible',
    contactMode: 'both',
    startDate: '2026-11-23', timeSlots: [{ days: ['Lunes'], startTime: '19:00', endTime: '20:00' }], footwear: ['Zapatillas'], availableSpots: 5, maxSpots: 10, status: 'published',
    teacher: { id: 't1', name: 'Carlos Pérez', whatsapp: '+51 911 222 333', instagram: '@carlosperez' },
    ...over,
  } as unknown as DanceClass;
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockList.mockResolvedValue([]);
  mockAuthState.profile = {
    id: 'u1', name: 'Alumna', role: 'alumno', photo_url: null, photo_position: null, photo_zoom: null,
    whatsapp: '+51 999 888 777', instagram: null,
  };
});

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

  it('cuando es la propia clase del profesor muestra enlace a /dashboard/reservas y no abre el modal', () => {
    render(<BookingCta cls={makeClass()} isLoggedIn isOwnClass variant="sidebar" />);
    const link = screen.getByRole('link', { name: /gestionar reservas/i });
    expect(link).toHaveAttribute('href', '/dashboard/reservas');
    expect(screen.queryByRole('button', { name: /reservar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cuando es la propia clase y está agotada (sold_out) sigue mostrando "Gestionar reservas"', () => {
    render(<BookingCta cls={makeClass({ availableSpots: 0 })} isLoggedIn isOwnClass variant="bar" />);
    const link = screen.getByRole('link', { name: /gestionar reservas/i });
    expect(link).toHaveAttribute('href', '/dashboard/reservas');
    expect(screen.queryByRole('button', { name: /sin cupos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sin sesión lleva a iniciar sesión y vuelve a la clase', () => {
    render(<BookingCta cls={makeClass()} isLoggedIn={false} variant="sidebar" />);
    const link = screen.getByRole('link', { name: /reservar/i });
    expect(link).toHaveAttribute('href', `/login?redirect=${encodeURIComponent('/bachata/taller/taller')}`);
  });

  it('no muestra nada si la clase ya finalizó', () => {
    const { container } = render(
      <BookingCta cls={makeClass({ startDate: '2020-01-01', endDate: '2020-01-02' })} isLoggedIn variant="sidebar" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('exige al menos WhatsApp o Instagram si el perfil no tiene contacto guardado', () => {
    mockAuthState.profile = {
      id: 'u1', name: 'Alumna', role: 'alumno', photo_url: null, photo_position: null, photo_zoom: null,
      whatsapp: null, instagram: null,
    };
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/ingresa tu whatsapp o tu usuario de instagram/i);
    expect(screen.queryByRole('button', { name: /solicitar reserva/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: '@soyalumna' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByRole('button', { name: /solicitar reserva/i })).toBeInTheDocument();
  });

  it('en clase Online muestra copy sin pago presencial y enlaza a /dashboard/mis-reservas', async () => {
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b-online', status: 'pending_confirmation' } });
    render(<BookingCta cls={makeClass({ modality: 'Online' })} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/coordinas el pago y el enlace de acceso directo con tu profesor/i)).toBeInTheDocument();
    expect(screen.queryByText(/el día de la clase/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(screen.getByRole('link', { name: /ver mis reservas/i })).toHaveAttribute('href', '/dashboard/mis-reservas'));
  });

  it('muestra error si falla la carga de fechas en modo por fecha', async () => {
    mockList.mockRejectedValue(new Error('No autenticado'));
    render(<BookingCta cls={makeClass({ bookingMode: 'session' })} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos cargar las fechas/i));
  });

  it('monta el modal en document.body vía portal fuera del contenedor del CTA', () => {
    const { container } = render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    const dialog = screen.getByRole('dialog');
    expect(document.body).toContainElement(dialog);
    expect(container).not.toContainElement(dialog);
  });

  it('en clase de pago crea solicitud pendiente y muestra CTAs de WhatsApp/Instagram del profesor', async () => {
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b1', status: 'pending_confirmation' } });
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/un mensaje para/i), { target: { value: 'Soy principiante' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/coordinas el pago directo con tu profesor/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(screen.getByText(/solicitud enviada/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /escribir por whatsapp/i })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/51911222333'),
    );
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute(
      'href',
      'https://instagram.com/carlosperez',
    );
    expect(mockReserve).toHaveBeenCalledWith({
      classId: 'c1', sessionId: null, seats: 1, note: 'Soy principiante', whatsapp: '+51 999 888 777',
    });
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ classId: 'c1', bookingMode: 'class', seats: 1, value: 40 }));
  });

  it('en clase gratuita confirma al instante y muestra "¡Tu cupo está listo!"', async () => {
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b-free', status: 'confirmed' } });
    render(<BookingCta cls={makeClass({ priceType: 'Gratis', price: 0 })} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));
    await waitFor(() => expect(screen.getByText(/tu cupo está listo/i)).toBeInTheDocument());
  });

  it('muestra el error de la base de datos si no se pudo reservar', async () => {
    mockReserve.mockResolvedValue({ ok: false, error: { code: 'SOLD_OUT', message: 'Ya no quedan cupos suficientes.' } });
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ya no quedan cupos suficientes.'));
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('en modo por fecha exige elegir una fecha antes de solicitar', async () => {
    mockList.mockResolvedValue([
      { id: 's1', classId: 'c1', date: '2026-12-02', startTime: '19:00', endTime: '20:30', capacity: 10, taken: 4, status: 'open' },
    ]);
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b2', status: 'pending_confirmation' } });
    render(<BookingCta cls={makeClass({ bookingMode: 'session' })} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));

    const next = screen.getByRole('button', { name: /elige una fecha/i });
    expect(next).toBeDisabled();
    fireEvent.click(await screen.findByText(/6 cupos/i));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(mockReserve).toHaveBeenCalledWith({
      classId: 'c1', sessionId: 's1', seats: 1, note: '', whatsapp: '+51 999 888 777',
    }));
  });

  it('permite seleccionar varias fechas, deshabilita las ya reservadas, limita cupos al mínimo y calcula el total', async () => {
    mockList.mockResolvedValue([
      { id: 's1', classId: 'c1', date: '2026-12-02', startTime: '19:00', endTime: '20:30', capacity: 10, taken: 8, status: 'open', alreadyBooked: false },
      { id: 's2', classId: 'c1', date: '2026-12-04', startTime: '19:00', endTime: '20:30', capacity: 10, taken: 4, status: 'open', alreadyBooked: false },
      { id: 's3', classId: 'c1', date: '2026-12-06', startTime: '19:00', endTime: '20:30', capacity: 10, taken: 1, status: 'open', alreadyBooked: true },
    ]);
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b1', bookingIds: ['b1', 'b2'], status: 'pending_confirmation' } });
    render(<BookingCta cls={makeClass({ bookingMode: 'session', price: 40 })} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));

    const alreadyBookedBtn = (await screen.findByText(/ya reservada/i)).closest('button')!;
    expect(alreadyBookedBtn).toBeDisabled();

    fireEvent.click(screen.getByText(/últimos 2 cupos/i).closest('button')!);
    fireEvent.click(screen.getByText(/6 cupos/i).closest('button')!);
    expect(screen.getByText(/2 fechas seleccionadas/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continuar \(2 fechas\)/i }));
    expect(screen.getByText(/hasta 2 cupos/i)).toBeInTheDocument();
    const plus = screen.getByRole('button', { name: /más cupos/i });
    fireEvent.click(plus);
    expect(plus).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText(/2 cupos × 2 fechas/i)).toBeInTheDocument();
    expect(screen.getByText(/160/)).toBeInTheDocument();
    expect(screen.getByText(/reserva independiente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /solicitar 2 reservas/i }));
    await waitFor(() => expect(screen.getByText(/tus 2 solicitudes fueron enviadas/i)).toBeInTheDocument());
    expect(mockReserve).toHaveBeenCalledWith({
      classId: 'c1', sessionIds: ['s1', 's2'], seats: 2, note: '', whatsapp: '+51 999 888 777',
    });
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ classId: 'c1', bookingMode: 'session', seats: 4, value: 160 }));
    expect(screen.getAllByRole('link', { name: /google calendar/i })).toHaveLength(2);
  });
});
