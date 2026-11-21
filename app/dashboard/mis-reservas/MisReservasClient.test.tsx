// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
      requirements: null,
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
  it('muestra Confirmada junto al badge "Es mañana" sin reemplazarlo', () => {
    render(<MisReservasClient bookings={[makeBooking({ status: 'confirmed' })]} today="2026-11-20" />);
    expect(screen.getByText('Es mañana')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });

  it('muestra Pendiente de confirmación junto al badge temporal en próximas', () => {
    render(
      <MisReservasClient
        bookings={[makeBooking({ status: 'pending_confirmation', session: { id: 's2', date: '2026-11-28', startTime: '10:30', endTime: '12:00' } })]}
        today="2026-11-20"
      />,
    );
    expect(screen.getByText('Faltan 8 días')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de confirmación')).toBeInTheDocument();
  });

  it('en reservas canceladas muestra solo el badge de estado', () => {
    render(<MisReservasClient bookings={[makeBooking({ status: 'cancelled' })]} today="2026-11-20" />);
    expect(screen.queryByText('Es mañana')).not.toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });
});
