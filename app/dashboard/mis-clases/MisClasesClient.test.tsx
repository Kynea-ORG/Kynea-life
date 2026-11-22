// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MisClasesClient from './MisClasesClient';
import type { DanceClass } from '@/lib/types';

afterEach(cleanup);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/classes/actions', () => ({
  updateClass: vi.fn(),
  deleteClass: vi.fn(),
  duplicateClass: vi.fn(),
  cancelAutoPublish: vi.fn(),
}));

function makeClass(overrides: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'cls-1',
    type: 'taller',
    title: 'Salsa Casino Intermedio',
    slug: 'salsa-casino-intermedio',
    style: 'Salsa',
    styleSlug: 'salsa',
    level: 'Intermedio',
    shortDescription: 'Descripción corta',
    fullDescription: 'Descripción completa',
    startDate: '2026-11-01',
    recurrence: 'mensual',
    timeSlots: [{ days: ['Lunes'], startTime: '19:00', endTime: '20:30' }],
    priceType: 'Mensual',
    price: 120,
    currency: 'PEN',
    maxSpots: 20,
    availableSpots: 12,
    modality: 'Presencial',
    city: 'Lima',
    district: 'Miraflores',
    coverImage: '',
    coverImagePosition: '50% 50%',
    coverImageZoom: 1,
    status: 'published',
    teacher: {
      id: 'teacher-1',
      slug: 'ana-torres',
      name: 'Ana Torres',
      type: 'profesor',
      photo: '',
      photoPosition: '50% 50%',
      photoZoom: 1,
      bio: '',
      experience: 5,
      styles: ['Salsa'],
      whatsapp: '999999999',
      showSpots: true,
      email: 'ana@kynea.dance',
    },
    metrics: { views: 42, contacts: 5, saved: 3 },
    createdAt: '2026-10-01T12:00:00Z',
    ...overrides,
  };
}

describe('MisClasesClient · vistas en modo superusuario', () => {
  it('muestra columna y valor de vistas en desktop y contador en mobile cuando isSuperuser=true', () => {
    const classes = [
      makeClass({ id: 'c1', title: 'Salsa Casino', metrics: { views: 128, contacts: 4, saved: 2 } }),
      makeClass({ id: 'c2', title: 'Bachata Sensual', status: 'draft', metrics: { views: 1, contacts: 0, saved: 0 } }),
      makeClass({ id: 'c3', title: 'Marinera Norteña', status: 'archived', metrics: { views: 0, contacts: 0, saved: 0 } }),
    ];

    render(<MisClasesClient initialClasses={classes} isSuperuser />);

    const table = screen.getByRole('table', { name: 'Mis clases' });
    expect(within(table).getByRole('columnheader', { name: 'Vistas' })).toBeInTheDocument();

    // Desktop cells
    expect(within(table).getByRole('cell', { name: '128 vistas' })).toHaveTextContent('128');
    expect(within(table).getByRole('cell', { name: '1 vista' })).toHaveTextContent('1');
    expect(within(table).getByRole('cell', { name: '0 vistas' })).toHaveTextContent('0');

    // Mobile cards
    expect(screen.getByText('128 vistas')).toBeInTheDocument();
    expect(screen.getByText('1 vista')).toBeInTheDocument();
    expect(screen.getByText('0 vistas')).toBeInTheDocument();
  });

  it('mantiene las vistas visibles al filtrar por pestaña de estado en modo superusuario', () => {
    const classes = [
      makeClass({ id: 'c1', title: 'Clase Publicada', status: 'published', metrics: { views: 75, contacts: 2, saved: 1 } }),
      makeClass({ id: 'c2', title: 'Clase Borrador', status: 'draft', metrics: { views: 0, contacts: 0, saved: 0 } }),
    ];

    render(<MisClasesClient initialClasses={classes} isSuperuser />);

    fireEvent.click(screen.getByRole('button', { name: /Publicadas/ }));

    const table = screen.getByRole('table', { name: 'Mis clases' });
    expect(within(table).getByRole('columnheader', { name: 'Vistas' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '75 vistas' })).toHaveTextContent('75');
    expect(within(table).queryByRole('cell', { name: '0 vistas' })).not.toBeInTheDocument();
  });

  it('no muestra la columna ni el indicador de vistas cuando isSuperuser=false', () => {
    const classes = [
      makeClass({ id: 'c1', title: 'Salsa Casino', metrics: { views: 128, contacts: 4, saved: 2 } }),
    ];

    render(<MisClasesClient initialClasses={classes} isSuperuser={false} />);

    const table = screen.getByRole('table', { name: 'Mis clases' });
    expect(within(table).queryByRole('columnheader', { name: 'Vistas' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('cell', { name: '128 vistas' })).not.toBeInTheDocument();
    expect(screen.queryByText('128 vistas')).not.toBeInTheDocument();
  });
});
