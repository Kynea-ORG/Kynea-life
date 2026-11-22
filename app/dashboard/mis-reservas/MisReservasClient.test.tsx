// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MyBooking } from '@/lib/bookings/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/components/SmartImage', () => ({
  default: () => null,
}));
vi.mock('@/lib/bookings/actions', () => ({
  cancelBooking: vi.fn(),
}));

import MisReservasClient from './MisReservasClient';

function makeBooking(over: Partial<MyBooking> = {}): MyBooking {
  return {
    id: 'b1',
    status: 'confirmed',
    seats: 1,
    priceAmount: 35,
    currency: 'PEN',
    paymentMethod: 'pay_at_venue',
    note: null,
    createdAt: '2026-11-20T12:00:00Z',
    class: {
      id: 'c1',
      title: 'Contemporáneo & Floorwork — Sábados',
      slug: 'contempo',
      type: 'clase-suelta',
      styleSlug: 'contemporaneo',
      modality: 'Presencial',
      startDate: '2026-11-21',
      endDate: null,
      startTime: '10:30',
      endTime: '12:00',
      cancellationPolicy: 'flexible',
      contactMode: 'whatsapp',
      coverImage: null,
      footwear: [],
      clothing: null,
      toBring: [],
      requirements: [],
      teacherName: 'José',
      teacherWhatsapp: '+51933839178',
      teacherInstagram: null,
      teacherShowWhatsapp: true,
      venueName: 'Estudio',
      address: 'Av. 123',
      reference: null,
      mapsUrl: null,
    },
    session: {
      id: 's1',
      date: '2026-11-21',
      startTime: '10:30',
      endTime: '12:00',
    },
    ...over,
  } as MyBooking;
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MisReservasClient', () => {
  it('muestra Confirmada junto al badge "Es mañana" sin reemplazarlo y solo el monto sin texto de pago pendiente', () => {
    render(<MisReservasClient bookings={[makeBooking({ status: 'confirmed' })]} today="2026-11-20" />);
    expect(screen.getByText('Es mañana')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText(/1 cupo · PEN 35/)).toBeInTheDocument();
    expect(screen.queryByText(/coordinas el pago con el profesor/i)).not.toBeInTheDocument();
  });

  it('muestra Pendiente de confirmación junto al badge temporal y la nota de pago en próximas', () => {
    render(
      <MisReservasClient
        bookings={[makeBooking({ status: 'pending_confirmation', session: { id: 's2', date: '2026-11-28', startTime: '10:30', endTime: '12:00' } })]}
        today="2026-11-20"
      />,
    );
    expect(screen.getByText('Faltan 8 días')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de confirmación')).toBeInTheDocument();
    expect(screen.getByText(/PEN 35 \(coordinas el pago con el profesor\)/)).toBeInTheDocument();
  });

  it('en reservas canceladas muestra solo el badge de estado y solo el monto', () => {
    render(<MisReservasClient bookings={[makeBooking({ status: 'cancelled' })]} today="2026-11-20" />);
    expect(screen.queryByText('Es mañana')).not.toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.getByText(/1 cupo · PEN 35/)).toBeInTheDocument();
    expect(screen.queryByText(/coordinas el pago con el profesor/i)).not.toBeInTheDocument();
  });

  it('usa "Cancelar solicitud" en pending_confirmation y muestra "Finalizada" para confirmadas pasadas en Historial', () => {
    const pending = makeBooking({
      id: 'b-p',
      status: 'pending_confirmation',
      session: { id: 's-fut', date: '2026-11-25', startTime: '10:30', endTime: '12:00' },
    });
    const pastConfirmed = makeBooking({
      id: 'b-old',
      status: 'confirmed',
      session: { id: 's-old', date: '2026-11-10', startTime: '10:30', endTime: '12:00' },
    });
    render(<MisReservasClient bookings={[pending, pastConfirmed]} today="2026-11-20" />);
    fireEvent.click(screen.getByRole('button', { name: /cómo prepararme/i }));
    expect(screen.getByRole('button', { name: 'Cancelar solicitud' })).toBeInTheDocument();
    expect(screen.getByText('Finalizada')).toBeInTheDocument();
  });
});
