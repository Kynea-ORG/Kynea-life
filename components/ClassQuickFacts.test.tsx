// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import ClassQuickFacts from './ClassQuickFacts';
import { formatFriendlyDate } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

const googleMapProps = vi.fn();
vi.mock('@/components/GoogleMap', () => ({
  default: (props: Record<string, unknown>) => { googleMapProps(props); return <div data-testid="live-map" />; },
}));
vi.mock('@/components/SmartImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(() => { cleanup(); googleMapProps.mockReset(); });

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'c1', startDate: '2099-09-06', timeSlots: [{ days: ['Domingo'], startTime: '11:00:00', endTime: '12:00:00' }],
    modality: 'Presencial', city: 'Lima', district: 'Miraflores', venueName: 'Garage Studio',
    lat: -12.12, lng: -77.03, mapImageUrl: 'https://maps.example/static.png',
    ...over,
  } as unknown as DanceClass;
}

describe('ClassQuickFacts', () => {
  it('recuadro "Cuándo": dos bloques con su etiqueta, INICIA con la fecha y HORARIO con días y horas', () => {
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    const tile = screen.getByTestId('when-tile');
    expect(within(tile).getByText('INICIA')).toBeInTheDocument();
    expect(within(tile).getByText(formatFriendlyDate('2099-09-06'))).toBeInTheDocument();
    expect(within(tile).getByText('HORARIO')).toBeInTheDocument();
    expect(within(tile).getByText('Domingo')).toBeInTheDocument();
    expect(within(tile).getByText('11:00 – 12:00')).toBeInTheDocument();
  });

  it('varios días en un turno se abrevian para que quepan', () => {
    const cls = makeClass({ timeSlots: [{ days: ['Lunes', 'Miércoles', 'Viernes'], startTime: '19:00:00', endTime: '20:30:00' }] });
    render(<ClassQuickFacts cls={cls} isExpired={false} />);
    expect(screen.getByText('Lun, Mié, Vie')).toBeInTheDocument();
    expect(screen.getByText('19:00 – 20:30')).toBeInTheDocument();
  });

  it('recuadro del mapa con imagen estática guardada: usa esa imagen, local y zona', () => {
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    expect(screen.getByRole('button', { name: /Ver ubicación/ })).toBeInTheDocument();
    expect(screen.getByText('Garage Studio')).toBeInTheDocument();
    expect(screen.getByText('Miraflores, Lima')).toBeInTheDocument();
    expect(document.querySelector('img[src="https://maps.example/static.png"]')).not.toBeNull();
    expect(screen.queryByTestId('live-map')).toBeNull();
  });

  it('sin imagen guardada pinta el mapa real, sin controles ni gestos (tocar baja a "Dónde es")', () => {
    render(<ClassQuickFacts cls={makeClass({ mapImageUrl: undefined })} isExpired={false} />);
    expect(screen.getByTestId('live-map')).toBeInTheDocument();
    expect(googleMapProps).toHaveBeenCalledWith(expect.objectContaining({
      controls: false,
      gestureHandling: 'none',
      // Si el mapa no carga, queda el fondo liso con el pin en vez del texto de error.
      errorFallback: expect.anything(),
      pins: [expect.objectContaining({ lat: -12.12, lng: -77.03 })],
    }));
    expect(screen.getByText('Garage Studio')).toBeInTheDocument();
  });

  it('tocar el mapa baja con scroll suave a "Dónde es"', () => {
    const target = document.createElement('div');
    target.id = 'donde-es';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver ubicación/ }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    target.remove();
  });

  it('sin coordenadas pero con nombre de local, el recuadro sigue mostrando dónde es (fondo liso, sin mapa)', () => {
    render(<ClassQuickFacts cls={makeClass({ lat: undefined, lng: undefined, mapImageUrl: undefined })} isExpired={false} />);
    expect(screen.getByRole('button', { name: /Ver ubicación/ })).toBeInTheDocument();
    expect(screen.queryByTestId('live-map')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('sin coordenadas, local ni dirección no hay recuadro de mapa y "Cuándo" ocupa todo el ancho', () => {
    render(<ClassQuickFacts cls={makeClass({ lat: undefined, lng: undefined, mapImageUrl: undefined, venueName: undefined, address: undefined })} isExpired={false} />);
    expect(screen.queryByRole('button', { name: /Ver ubicación/ })).toBeNull();
    expect(screen.getByTestId('quick-facts').className).toContain('grid-cols-1');
  });

  it('con dos recuadros usa dos columnas', () => {
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    expect(screen.getByTestId('quick-facts').className).toContain('grid-cols-2');
  });

  it('varios turnos: muestra el primero con "+N horarios" y al tocar despliega todos', () => {
    const cls = makeClass({ timeSlots: [
      { days: ['Lunes'], startTime: '19:00:00', endTime: '20:00:00' },
      { days: ['Miércoles'], startTime: '19:00:00', endTime: '20:00:00' },
    ] });
    render(<ClassQuickFacts cls={cls} isExpired={false} />);
    expect(screen.getByText('+1 horario')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver horarios/ }));
    expect(screen.getByText('Lunes · 19:00 – 20:00')).toBeInTheDocument();
    expect(screen.getByText('Miércoles · 19:00 – 20:00')).toBeInTheDocument();
  });

  it('con un solo horario el recuadro no es un botón', () => {
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    expect(screen.queryByRole('button', { name: /Ver horarios/ })).toBeNull();
  });

  it('finalizada: "FINALIZÓ" con la fecha de fin, en gris', () => {
    render(<ClassQuickFacts cls={makeClass({ endDate: '2020-02-10', startDate: '2020-01-10' })} isExpired />);
    expect(screen.getByText('FINALIZÓ')).toBeInTheDocument();
    expect(screen.getByText('HORARIO')).toBeInTheDocument();
    expect(screen.getByText(formatFriendlyDate('2020-02-10'))).toBeInTheDocument();
    expect(screen.getByTestId('when-tile').className).toContain('bg-neutral-100');
  });

  it('no muestra puntaje, reseñas ni cupos', () => {
    render(<ClassQuickFacts cls={makeClass({ availableSpots: 3, maxSpots: 12 })} isExpired={false} />);
    expect(screen.queryByText(/cupos|reseñas|★/i)).toBeNull();
  });

  it('sin fecha, horario ni lugar no renderiza nada', () => {
    const { container } = render(<ClassQuickFacts cls={makeClass({ startDate: '', timeSlots: [], lat: undefined, lng: undefined, venueName: undefined, address: undefined })} isExpired={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
