// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import FilterPanel, { EMPTY_FILTERS } from './FilterPanel';

afterEach(cleanup);

const props = { danceStyles: ['Salsa', 'Bachata'], levels: ['Principiante'] };

function sectionTitles(container: HTMLElement) {
  return [...container.querySelectorAll('button.w-full.text-\\[13px\\]')].map(b => b.textContent?.trim());
}

describe('FilterPanel · País', () => {
  it('aparece justo debajo de "Estilo de baile", antes de "Nivel"', () => {
    const { container } = render(
      <FilterPanel filters={EMPTY_FILTERS} onChange={() => {}} countries={['PE', 'CO']} {...props} />,
    );
    const titles = sectionTitles(container);
    const i = titles.indexOf('País');
    expect(i).toBeGreaterThan(-1);
    expect(titles[i - 1]).toBe('Estilo de baile');
    expect(titles[i + 1]).toBe('Nivel');
  });

  it('con "hideStyles" queda arriba de "Nivel" igualmente', () => {
    const { container } = render(
      <FilterPanel filters={EMPTY_FILTERS} onChange={() => {}} countries={['PE', 'CO']} hideStyles {...props} />,
    );
    const titles = sectionTitles(container);
    expect(titles.indexOf('País')).toBe(titles.indexOf('Nivel') - 1);
  });

  it('no se muestra con un solo país', () => {
    render(<FilterPanel filters={EMPTY_FILTERS} onChange={() => {}} countries={['PE']} {...props} />);
    expect(screen.queryByText('País')).not.toBeInTheDocument();
  });

  it('con pocos países muestra chips con bandera, sin pedir buscar', () => {
    render(<FilterPanel filters={EMPTY_FILTERS} onChange={() => {}} countries={['PE', 'CO', 'MX']} {...props} />);
    expect(screen.getByRole('button', { name: /Perú/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Colombia/ })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar país…')).not.toBeInTheDocument();
  });

  it('elegir un chip aplica el país y volver a tocarlo lo quita', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FilterPanel filters={EMPTY_FILTERS} onChange={onChange} countries={['PE', 'CO']} {...props} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Colombia/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, country: 'CO' });

    rerender(<FilterPanel filters={{ ...EMPTY_FILTERS, country: 'CO' }} onChange={onChange} countries={['PE', 'CO']} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Colombia/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, country: '' });
  });

  it('con muchos países usa el buscador', () => {
    const many = ['PE', 'CO', 'MX', 'AR', 'CL', 'EC', 'UY'];
    render(<FilterPanel filters={EMPTY_FILTERS} onChange={() => {}} countries={many} {...props} />);
    expect(screen.getByPlaceholderText('Buscar país…')).toBeInTheDocument();
  });
});

describe('FilterPanel · Dictadas por profesoras', () => {
  it('muestra el filtro y lo activa/desactiva', () => {
    const onChange = vi.fn();
    const { rerender } = render(<FilterPanel filters={EMPTY_FILTERS} onChange={onChange} {...props} />);
    const box = screen.getByRole('checkbox', { name: /Dictadas por profesoras/ });
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, withWomenTeachers: true });

    rerender(<FilterPanel filters={{ ...EMPTY_FILTERS, withWomenTeachers: true }} onChange={onChange} {...props} />);
    expect(screen.getByRole('checkbox', { name: /Dictadas por profesoras/ })).toBeChecked();
    expect(screen.getByText('1 filtro activo')).toBeInTheDocument();
  });
});
