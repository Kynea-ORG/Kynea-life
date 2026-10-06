// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ClassQuickFacts from './ClassQuickFacts';
import { formatFriendlyDate } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

vi.mock('@/components/SmartImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(cleanup);

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'c1', startDate: '2099-09-06', timeSlots: [{ days: ['Domingo'], startTime: '11:00:00', endTime: '12:00:00' }],
    modality: 'Presencial', city: 'Lima', district: 'Miraflores', venueName: 'Garage Studio',
    lat: -12.12, lng: -77.03, mapImageUrl: 'https://maps.example/static.png',
    ...over,
  } as unknown as DanceClass;
}

describe('ClassQuickFacts', () => {
  it('recuadro "Cuándo": etiqueta, fecha de inicio y horario', () => {
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    expect(screen.getByText('INICIA')).toBeInTheDocument();
    expect(screen.getByText(formatFriendlyDate('2099-09-06'))).toBeInTheDocument();
    expect(screen.getByText('Domingo · 11:00 – 12:00')).toBeInTheDocument();
  });

  it('recuadro del mapa: imagen estática, local y zona', () => {
    render(<ClassQuickFacts cls={makeClass()} isExpired={false} />);
    expect(screen.getByRole('button', { name: /Ver ubicación/ })).toBeInTheDocument();
    expect(screen.getByText('Garage Studio')).toBeInTheDocument();
    expect(screen.getByText('Miraflores, Lima')).toBeInTheDocument();
    expect(document.querySelector('img[src="https://maps.example/static.png"]')).not.toBeNull();
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

  it('sin imagen de mapa el recuadro se muestra igual, con fondo liso y el pin (no simula un mapa)', () => {
    render(<ClassQuickFacts cls={makeClass({ mapImageUrl: undefined })} isExpired={false} />);
    expect(screen.getByRole('button', { name: /Ver ubicación/ })).toBeInTheDocument();
    expect(screen.getByText('Garage Studio')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('sin coordenadas pero con nombre de local, el recuadro sigue mostrando dónde es', () => {
    render(<ClassQuickFacts cls={makeClass({ lat: undefined, lng: undefined, mapImageUrl: undefined })} isExpired={false} />);
    expect(screen.getByRole('button', { name: /Ver ubicación/ })).toBeInTheDocument();
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

  it('varios horarios: muestra el primero con "+N más" y al tocar despliega todos', () => {
    const cls = makeClass({ timeSlots: [
      { days: ['Lunes'], startTime: '19:00:00', endTime: '20:00:00' },
      { days: ['Miércoles'], startTime: '19:00:00', endTime: '20:00:00' },
    ] });
    render(<ClassQuickFacts cls={cls} isExpired={false} />);
    expect(screen.getByText('Lunes · 19:00 – 20:00 +1 más')).toBeInTheDocument();
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
