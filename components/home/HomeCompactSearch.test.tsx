// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import HomeCompactSearch from './HomeCompactSearch';

afterEach(cleanup);

const base = { value: '', onChange: () => {}, onSubmit: () => {}, isAiMode: true, isLoading: false, placeholder: '¿Qué tienes ganas de bailar?' };

describe('HomeCompactSearch', () => {
  it('muestra el placeholder y refleja el valor', () => {
    render(<HomeCompactSearch {...base} value="salsa" />);
    expect(screen.getByRole('searchbox')).toHaveValue('salsa');
    expect(screen.getByPlaceholderText('¿Qué tienes ganas de bailar?')).toBeInTheDocument();
  });

  it('avisa los cambios de texto', () => {
    const onChange = vi.fn();
    render(<HomeCompactSearch {...base} onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'heels' } });
    expect(onChange).toHaveBeenCalledWith('heels');
  });

  it('enviar el formulario llama onSubmit con el texto actual', () => {
    const onSubmit = vi.fn();
    render(<HomeCompactSearch {...base} value="bachata" onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('search'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('no envía mientras está buscando ni con el campo vacío', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<HomeCompactSearch {...base} value="x" isLoading onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('search'));
    rerender(<HomeCompactSearch {...base} value="   " onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('search'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
