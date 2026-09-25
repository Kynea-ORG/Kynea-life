// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import CurrencySelect from './CurrencySelect';

afterEach(cleanup);

describe('CurrencySelect component', () => {
  it('renders trigger with placeholder when no value is provided', () => {
    render(<CurrencySelect value="" onChange={vi.fn()} placeholder="Seleccionar moneda..." />);
    expect(screen.getByText('Seleccionar moneda...')).toBeDefined();
  });

  it('renders selected currency flag, code and symbol', () => {
    render(<CurrencySelect value="CLP" onChange={vi.fn()} />);
    expect(screen.getByText('CLP')).toBeDefined();
    expect(screen.getByText('🇨🇱')).toBeDefined();
    expect(screen.getByText('($)')).toBeDefined();
  });

  it('opens popover when trigger is clicked', () => {
    render(<CurrencySelect value="PEN" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Buscar por moneda, país o código...')).toBeDefined();
    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('filters currencies when typing in search input (by country or name)', () => {
    render(<CurrencySelect value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText('Buscar por moneda, país o código...');
    fireEvent.change(searchInput, { target: { value: 'chile' } });

    expect(screen.getByText('CLP')).toBeDefined();
    expect(screen.getByText('Peso chileno')).toBeDefined();
    expect(screen.queryByText('EUR')).toBeNull();
  });

  it('navigates with ArrowDown / ArrowUp and selects with Enter', () => {
    const handleChange = vi.fn();
    render(<CurrencySelect value="" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Buscar por moneda, país o código...');

    fireEvent.change(searchInput, { target: { value: 'boliviano' } });
    expect(screen.getByText('BOB')).toBeDefined();

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('BOB');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('calls onChange with selected currency code on click', () => {
    const handleChange = vi.fn();
    render(<CurrencySelect value="PEN" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Buscar por moneda, país o código...');
    fireEvent.change(searchInput, { target: { value: 'dolar estad' } });

    const option = screen.getByText('USD');
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith('USD');
  });
});
