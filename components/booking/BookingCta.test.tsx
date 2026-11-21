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

  it('multiselect de canales: deshabilita Continuar sin canal o con enlaces/errores y envía solo los seleccionados', async () => {
    mockAuthState.profile = {
      id: 'u1', name: 'Alumna', role: 'alumno', photo_url: null, photo_position: null, photo_zoom: null,
      whatsapp: null, instagram: null,
    };
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b-multi-ch', status: 'pending_confirmation' } });
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));

    expect(screen.getByText(/mínimo 1/i)).toBeInTheDocument();
    const waToggle = screen.getByRole('button', { name: /^whatsapp$/i });
    const igToggle = screen.getByRole('button', { name: /^instagram$/i });
    const nextBtn = screen.getByRole('button', { name: /continuar/i });

    // Sin canales seleccionados: inputs ocultos y Continuar deshabilitado
    expect(waToggle).toHaveAttribute('aria-pressed', 'false');
    expect(igToggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText(/^whatsapp$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^instagram$/i)).not.toBeInTheDocument();
    expect(nextBtn).toBeDisabled();

    // Activar WhatsApp: muestra PhoneCountrySelect (+51) e input numérico
    fireEvent.click(waToggle);
    expect(waToggle).toHaveAttribute('aria-pressed', 'true');
    const waInput = screen.getByLabelText(/^whatsapp$/i);
    const dialBtn = screen.getByRole('button', { name: /\+51/ });
    expect(dialBtn).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();

    // Rechaza enlaces y caracteres inválidos en WhatsApp
    fireEvent.change(waInput, { target: { value: 'https://wa.me/51999888777' } });
    expect(nextBtn).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/sin enlaces ni espacios/i);

    // Cambiar país a Argentina (+54) e ingresar número local válido
    fireEvent.click(dialBtn);
    fireEvent.click(screen.getByRole('option', { name: /argentina/i }));
    expect(screen.getByRole('button', { name: /\+54/ })).toBeInTheDocument();
    fireEvent.change(waInput, { target: { value: '1198765432' } });
    expect(nextBtn).toBeEnabled();

    // Activar también Instagram: si queda vacío o con enlace vuelve a deshabilitar Continuar
    fireEvent.click(igToggle);
    expect(igToggle).toHaveAttribute('aria-pressed', 'true');
    const igInput = screen.getByLabelText(/^instagram$/i);
    expect(nextBtn).toBeDisabled();

    fireEvent.change(igInput, { target: { value: 'https://instagram.com/soyalumna' } });
    expect(nextBtn).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/sin enlaces ni espacios/i);

    // Con usuario válido (limpiando @ inicial) se habilita y envía ambos canales
    fireEvent.change(igInput, { target: { value: '@soyalumna' } });
    expect(igInput).toHaveValue('soyalumna');
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);
    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(mockReserve).toHaveBeenCalledWith({
      classId: 'c1',
      sessionId: null,
      seats: 1,
      note: '',
      whatsapp: '+541198765432',
      instagram: 'soyalumna',
      saveContact: true,
    }));
  });

  it('oculta el checkbox cuando el canal ya existe en el perfil y permite desmarcar saveContact cuando es nuevo', async () => {
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b-opt-out', status: 'pending_confirmation' } });
    const { unmount } = render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    expect(screen.queryByRole('checkbox', { name: /guardar en mi perfil/i })).not.toBeInTheDocument();
    unmount();

    mockAuthState.profile = {
      id: 'u1', name: 'Alumna', role: 'alumno', photo_url: null, photo_position: null, photo_zoom: null,
      whatsapp: null, instagram: null,
    };
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^whatsapp$/i }));
    const saveCheckbox = screen.getByRole('checkbox', { name: /guardar en mi perfil/i });
    expect(saveCheckbox).toBeChecked();
    fireEvent.click(saveCheckbox);
    expect(saveCheckbox).not.toBeChecked();

    fireEvent.change(screen.getByLabelText(/^whatsapp$/i), { target: { value: '999888777' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(mockReserve).toHaveBeenCalledWith({
      classId: 'c1', sessionId: null, seats: 1, note: '', whatsapp: '+51999888777', saveContact: false,
    }));
    expect(mockAuthState.refreshProfile).not.toHaveBeenCalled();
  });

  it('si el usuario desactiva un canal prellenado del perfil, envía solo el canal seleccionado', async () => {
    mockAuthState.profile = {
      id: 'u1', name: 'Alumna', role: 'alumno', photo_url: null, photo_position: null, photo_zoom: null,
      whatsapp: '+51 999 888 777', instagram: '@perfil_ig',
    };
    mockReserve.mockResolvedValue({ ok: true, data: { bookingId: 'b-ig-only', status: 'pending_confirmation' } });
    render(<BookingCta cls={makeClass()} isLoggedIn variant="sidebar" />);
    fireEvent.click(screen.getByRole('button', { name: /^reservar$/i }));

    // Ambos preseleccionados desde el perfil
    expect(screen.getByRole('button', { name: /^whatsapp$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^instagram$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/^whatsapp$/i)).toHaveValue('999888777');
    expect(screen.getByLabelText(/^instagram$/i)).toHaveValue('perfil_ig');

    // Desactiva WhatsApp -> solo envía Instagram
    fireEvent.click(screen.getByRole('button', { name: /^whatsapp$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitar reserva/i }));
    await waitFor(() => expect(mockReserve).toHaveBeenCalledWith({
      classId: 'c1',
      sessionId: null,
      seats: 1,
      note: '',
      instagram: 'perfil_ig',
    }));
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
      classId: 'c1', sessionId: null, seats: 1, note: 'Soy principiante', whatsapp: '+51999888777',
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
      classId: 'c1', sessionId: 's1', seats: 1, note: '', whatsapp: '+51999888777',
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
      classId: 'c1', sessionIds: ['s1', 's2'], seats: 2, note: '', whatsapp: '+51999888777',
    });
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ classId: 'c1', bookingMode: 'session', seats: 4, value: 160 }));
    expect(screen.getAllByRole('link', { name: /google calendar/i })).toHaveLength(2);
  });
});
