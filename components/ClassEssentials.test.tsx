// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import ClassEssentials from './ClassEssentials';
import { formatFriendlyDate } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

afterEach(cleanup);

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    startDate: '2099-09-06', endDate: undefined,
    timeSlots: [{ days: ['Domingo'], startTime: '11:00:00', endTime: '12:00:00' }],
    modality: 'Presencial', city: 'Lima', district: 'Miraflores', venueName: 'Garage Studio', contactMode: 'both',
    teacher: { type: 'academia' },
    ...over,
  } as unknown as DanceClass;
}

describe('ClassEssentials ("Lo esencial", solo desktop)', () => {
  it('cuatro tarjetas: inicio, horario, dónde y contacto directo', () => {
    render(<ClassEssentials cls={makeClass()} isExpired={false} />);
    expect(screen.getByRole('heading', { name: 'Lo esencial' })).toBeInTheDocument();
    expect(screen.getByText(`Inicia ${formatFriendlyDate('2099-09-06')}`)).toBeInTheDocument();
    expect(screen.getByText('Domingo · 11:00 – 12:00')).toBeInTheDocument();
    expect(screen.getByText('1 hora por sesión')).toBeInTheDocument();
    expect(screen.getByText('Garage Studio')).toBeInTheDocument();
    expect(screen.getByText('Miraflores, Lima')).toBeInTheDocument();
    expect(screen.getByText('Contacto directo con la academia')).toBeInTheDocument();
    expect(screen.getByText('Por WhatsApp o Instagram')).toBeInTheDocument();
  });

  it('con fecha de fin, el inicio dice hasta cuándo', () => {
    render(<ClassEssentials cls={makeClass({ endDate: '2099-11-29' })} isExpired={false} />);
    expect(screen.getByText(`Hasta ${formatFriendlyDate('2099-11-29')}`)).toBeInTheDocument();
  });

  it('con varios turnos muestra el primero y "+N más"', () => {
    const cls = makeClass({ timeSlots: [
      { days: ['Lunes'], startTime: '19:00:00', endTime: '20:00:00' },
      { days: ['Jueves'], startTime: '19:00:00', endTime: '20:00:00' },
    ] });
    render(<ClassEssentials cls={cls} isExpired={false} />);
    expect(screen.getByText('Lunes · 19:00 – 20:00 +1 más')).toBeInTheDocument();
  });

  it('para un profesor dice "el profesor" y respeta el canal elegido', () => {
    render(<ClassEssentials cls={makeClass({ teacher: { type: 'profesor' } as never, contactMode: 'whatsapp' })} isExpired={false} />);
    expect(screen.getByText('Contacto directo con el profesor')).toBeInTheDocument();
    expect(screen.getByText('Por WhatsApp')).toBeInTheDocument();
  });

  it('finalizada: cuenta cuándo terminó', () => {
    render(<ClassEssentials cls={makeClass({ startDate: '2020-01-10', endDate: '2020-02-10' })} isExpired />);
    expect(screen.getByText(`Finalizó el ${formatFriendlyDate('2020-02-10')}`)).toBeInTheDocument();
  });

  it('omite las tarjetas sin dato', () => {
    render(<ClassEssentials cls={makeClass({ startDate: '', timeSlots: [], venueName: undefined, district: '', city: '' })} isExpired={false} />);
    const cards = screen.getAllByTestId('essential-card');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Contacto directo con la academia')).toBeInTheDocument();
  });

  it('solo se ve desde lg', () => {
    render(<ClassEssentials cls={makeClass()} isExpired={false} />);
    expect(screen.getByTestId('class-essentials').className).toContain('hidden lg:block');
  });
});
