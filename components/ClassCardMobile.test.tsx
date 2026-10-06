// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ClassCardMobile from './ClassCardMobile';
import { formatFriendlyDate } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

vi.mock('@/lib/maps/staticMap', () => ({ generateAndCacheVenueMapImage: vi.fn(async () => null) }));
vi.mock('@/components/SmartImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
const trackSelectItem = vi.fn();
vi.mock('@/lib/analytics', () => ({ trackSelectItem: (...a: unknown[]) => trackSelectItem(...a) }));

afterEach(() => { cleanup(); trackSelectItem.mockReset(); });

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'c1', slug: 'heels-method', styleSlug: 'heels', type: 'taller', title: 'Heels Method Principiantes',
    style: 'Heels', level: 'Principiante', shortDescription: '', fullDescription: '',
    startDate: '2099-09-14', recurrence: 'mensual',
    timeSlots: [{ days: ['Lunes'], startTime: '20:30:00', endTime: '22:00:00' }],
    priceType: 'Mensual', price: 120, currency: 'PEN', modality: 'Presencial',
    city: 'Lima', district: 'Miraflores', venueName: 'Freesoul Studio', countryCode: 'PE',
    coverImage: 'cover.jpg', coverImagePosition: '50% 50%', coverImageZoom: 1,
    availableSpots: 2, maxSpots: 12, status: 'published',
    teacher: { id: 't1', name: 'Cristal', showSpots: true },
    ...over,
  } as unknown as DanceClass;
}

describe.each(['carousel', 'row'] as const)('ClassCardMobile · %s', layout => {
  it('muestra categoría, título, nivel, lugar, cuándo inicia con su horario y precio', () => {
    render(<ClassCardMobile cls={makeClass()} layout={layout} listName="test" />);
    expect(screen.getAllByText('Heels').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Heels Method Principiantes' })).toHaveAttribute('href', '/heels/taller/heels-method');
    expect(screen.getByText('Taller · Principiante')).toBeInTheDocument();
    expect(screen.getByText('Freesoul Studio · Miraflores')).toBeInTheDocument();
    expect(screen.getByText(`Inicia ${formatFriendlyDate('2099-09-14')} · 20:30–22:00`)).toBeInTheDocument();
    expect(screen.getByText('S/120/mes')).toBeInTheDocument();
  });

  it('muestra la bandera del país de la clase', () => {
    render(<ClassCardMobile cls={makeClass()} layout={layout} listName="test" />);
    expect(screen.getByLabelText(/Clase en Perú/)).toBeInTheDocument();
  });

  it('no muestra cupos (no se conocen) ni botones de contacto', () => {
    render(<ClassCardMobile cls={makeClass({ availableSpots: 2 })} layout={layout} listName="test" />);
    expect(screen.queryByText(/cupos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sin cupos/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Contactar/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ver clase')).not.toBeInTheDocument();
  });

  it('con oferta tacha el precio base y destaca el de oferta', () => {
    render(<ClassCardMobile cls={makeClass({ price: 240, offerPrice: 230 })} layout={layout} listName="test" />);
    expect(screen.getByText('S/240/mes')).toHaveClass('line-through');
    expect(screen.getByText('S/230/mes')).toBeInTheDocument();
  });

  it('una clase finalizada lo indica en vez de cuándo inicia', () => {
    render(<ClassCardMobile cls={makeClass({ startDate: '2020-01-06', endDate: '2020-02-24' })} layout={layout} listName="test" />);
    expect(screen.getByText('Finalizada')).toBeInTheDocument();
    expect(screen.getByText(`Finalizó el ${formatFriendlyDate('2020-02-24')}`)).toBeInTheDocument();
  });

  it('guardar alterna el estado sin navegar', () => {
    render(<ClassCardMobile cls={makeClass()} layout={layout} listName="test" />);
    const save = screen.getByRole('button', { name: 'Guardar clase' });
    fireEvent.click(save);
    expect(screen.getByRole('button', { name: 'Guardado' })).toBeInTheDocument();
  });

  it('abrir la clase registra el evento de selección con la lista de origen', () => {
    render(<ClassCardMobile cls={makeClass()} layout={layout} listName="home_recommended" />);
    fireEvent.click(screen.getByRole('link', { name: 'Heels Method Principiantes' }));
    expect(trackSelectItem).toHaveBeenCalledWith(expect.objectContaining({ classId: 'c1', listName: 'home_recommended' }));
  });
});

describe('ClassCardMobile · row', () => {
  it('muestra las etiquetas de coincidencia de la búsqueda con IA', () => {
    render(<ClassCardMobile cls={makeClass()} layout="row" listName="resultados" matchBadges={['Fin de semana', 'Económico']} />);
    expect(screen.getByText('Fin de semana')).toBeInTheDocument();
    expect(screen.getByText('Económico')).toBeInTheDocument();
  });
});
