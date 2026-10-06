// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ClassSchedule from './ClassSchedule';
import { formatFriendlyDate } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

afterEach(cleanup);

const makeClass = (over: Partial<DanceClass> = {}) => ({
  startDate: '2099-09-06', endDate: '2099-11-29',
  timeSlots: [{ days: ['Domingo'], startTime: '11:00:00', endTime: '12:00:00' }],
  ...over,
}) as unknown as DanceClass;

describe('ClassSchedule ("Horario", solo desktop)', () => {
  it('muestra cada turno y el rango de fechas', () => {
    render(<ClassSchedule cls={makeClass()} />);
    expect(screen.getByRole('heading', { name: 'Horario' })).toBeInTheDocument();
    expect(screen.getByText('Domingo · 11:00 – 12:00')).toBeInTheDocument();
    expect(screen.getByText(`Del ${formatFriendlyDate('2099-09-06')} al ${formatFriendlyDate('2099-11-29')}`)).toBeInTheDocument();
  });

  it('marca los días de la semana en que hay clase', () => {
    render(<ClassSchedule cls={makeClass({ timeSlots: [
      { days: ['Lunes', 'Miércoles'], startTime: '19:00:00', endTime: '20:00:00' },
      { days: ['Domingo'], startTime: '11:00:00', endTime: '12:00:00' },
    ] })} />);
    const chips = screen.getAllByTestId('weekday');
    expect(chips).toHaveLength(7);
    expect(chips.filter(c => c.getAttribute('aria-pressed') === 'true' || c.dataset.active === 'true').map(c => c.getAttribute('aria-label'))).toEqual(['Lunes', 'Miércoles', 'Domingo']);
  });

  it('sin horarios no se muestra', () => {
    const { container } = render(<ClassSchedule cls={makeClass({ timeSlots: [] })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sin fecha de fin dice cuándo inicia', () => {
    render(<ClassSchedule cls={makeClass({ endDate: undefined })} />);
    expect(screen.getByText(`Inicia el ${formatFriendlyDate('2099-09-06')}`)).toBeInTheDocument();
  });
});
