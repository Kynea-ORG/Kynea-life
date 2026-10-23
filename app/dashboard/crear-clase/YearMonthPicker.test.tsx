// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import YearMonthPicker from './YearMonthPicker';

afterEach(cleanup);

const base = { today: '2026-10-03', startDate: '2026-10-10', value: [] as string[], onChange: () => {} };

describe('YearMonthPicker', () => {
  it('muestra 12 meses desde el mes actual, con el año en el aria-label', () => {
    render(<YearMonthPicker {...base} />);
    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(screen.getByRole('button', { name: /Octubre 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Septiembre 2027/ })).toBeInTheDocument();
  });

  it('el mes inicial aparece activo y no se puede quitar', () => {
    const onChange = vi.fn();
    render(<YearMonthPicker {...base} onChange={onChange} />);
    const start = screen.getByRole('button', { name: /Octubre 2026/ });
    expect(start).toBeDisabled();
    expect(start).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(start);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('deshabilita los meses anteriores al inicial', () => {
    render(<YearMonthPicker {...base} today="2026-10-03" startDate="2026-12-05" />);
    expect(screen.getByRole('button', { name: /Noviembre 2026/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Enero 2027/ })).toBeEnabled();
  });

  it('al tocar un mes lo agrega, y lo devuelve ordenado', () => {
    const onChange = vi.fn();
    render(<YearMonthPicker {...base} value={['2027-01']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Noviembre 2026/ }));
    expect(onChange).toHaveBeenCalledWith(['2026-11', '2027-01']);
  });

  it('al tocar un mes marcado lo quita', () => {
    const onChange = vi.fn();
    render(<YearMonthPicker {...base} value={['2026-11', '2027-01']} onChange={onChange} />);
    const nov = screen.getByRole('button', { name: /Noviembre 2026/ });
    expect(nov).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(nov);
    expect(onChange).toHaveBeenCalledWith(['2027-01']);
  });

  it('sin meses marcados explica qué hace; con meses cuenta las copias', () => {
    const { rerender } = render(<YearMonthPicker {...base} />);
    expect(screen.getByText(/creamos una copia por cada mes/i)).toBeInTheDocument();

    rerender(<YearMonthPicker {...base} value={['2026-11']} />);
    expect(screen.getByText(/1 copia en borrador/i)).toBeInTheDocument();

    rerender(<YearMonthPicker {...base} value={['2026-11', '2026-12']} />);
    expect(screen.getByText(/2 copias en borrador/i)).toBeInTheDocument();
    expect(screen.getByText(/14 días antes/i)).toBeInTheDocument();
  });

  it('sin fecha de inicio válida no se muestra', () => {
    const { container } = render(<YearMonthPicker {...base} startDate="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
