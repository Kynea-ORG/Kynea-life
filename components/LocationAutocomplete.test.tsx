// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import LocationAutocomplete from './LocationAutocomplete';
import type { LocationOption } from '@/lib/catalog/queries';

const mockOptions: LocationOption[] = [
  { city: 'Lima', district: 'Miraflores', label: 'Miraflores, Lima', activeClassesCount: 15 },
  { city: 'Lima', district: 'Barranco', label: 'Barranco, Lima', activeClassesCount: 3 },
  { city: 'Lima', district: 'San Isidro', label: 'San Isidro, Lima', activeClassesCount: 0 },
  { city: 'Ica', district: undefined, label: 'Ica', activeClassesCount: 2 },
  { city: 'Arequipa', district: undefined, label: 'Arequipa', activeClassesCount: 0 },
];

describe('LocationAutocomplete component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });
    cleanup();
  });

  it('renders input with default placeholder "¿Dónde bailas?"', () => {
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('¿Dónde bailas?')).toBeDefined();
  });

  it('renders selected location label if provided', () => {
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity="Lima"
        selectedDistrict="Miraflores"
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Miraflores, Lima');
  });

  it('shows 2-character hint when user focuses and has typed less than 2 letters', () => {
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByText(/Escribe 2 letras de un distrito o ciudad/i)).toBeDefined();

    fireEvent.change(input, { target: { value: 'm' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/Escribe al menos 2 letras para buscar distritos/i)).toBeDefined();
  });

  it('filters and displays active options with badge when query >= 2 letters', () => {
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mira' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Miraflores, Lima')).toBeDefined();
    expect(screen.getByText('15 clases')).toBeDefined();
  });

  it('selects active option on click and invokes onSelectLocation', () => {
    const handleSelect = vi.fn();
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={handleSelect}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ba' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const option = screen.getByText('Barranco, Lima');
    fireEvent.click(option);

    expect(handleSelect).toHaveBeenCalledWith('Lima', 'Barranco');
  });

  it('supports keyboard navigation with ArrowDown and selects with Enter', () => {
    const handleSelect = vi.fn();
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={handleSelect}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mira' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Press ArrowDown to highlight first matching active option
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith('Lima', 'Miraflores');
  });

  it('displays zero-count options with (Sin clases) and does NOT select them', () => {
    const handleSelect = vi.fn();
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={handleSelect}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'san' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('San Isidro, Lima')).toBeDefined();
    expect(screen.getByText('(Sin clases)')).toBeDefined();

    const disabledOption = screen.getByText('San Isidro, Lima');
    fireEvent.click(disabledOption);

    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('clears location when clear button is clicked', () => {
    const handleClear = vi.fn();
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity="Lima"
        selectedDistrict="Miraflores"
        onSelectLocation={vi.fn()}
        onClearLocation={handleClear}
      />
    );

    const clearBtn = screen.getByLabelText('Limpiar ubicación');
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalled();
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('triggers onUseCurrentLocation when "Usar mi ubicación actual" is clicked', () => {
    const handleUseCurrent = vi.fn();
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
        onUseCurrentLocation={handleUseCurrent}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const useLocationBtn = screen.getByText('Usar mi ubicación actual');
    fireEvent.click(useLocationBtn);

    expect(handleUseCurrent).toHaveBeenCalled();
  });

  it('shows existing selected location suggestion on focus without prompting for 2 letters', () => {
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity="Lima"
        selectedDistrict="Miraflores"
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.queryByText(/Escribe 2 letras de un distrito o ciudad/i)).toBeNull();
    expect(screen.getByText('Miraflores, Lima')).toBeDefined();
    expect(screen.getByText('15 clases')).toBeDefined();
  });

  it('allows clicking the already selected option to trigger onSelectLocation again as refresh', () => {
    const handleSelect = vi.fn();
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity="Lima"
        selectedDistrict="Miraflores"
        onSelectLocation={handleSelect}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const option = screen.getByText('Miraflores, Lima');
    fireEvent.click(option);

    expect(handleSelect).toHaveBeenCalledWith('Lima', 'Miraflores');
  });

  it('shows friendly empty message when no classes exist for query', () => {
    render(
      <LocationAutocomplete
        locationOptions={mockOptions}
        selectedCity=""
        selectedDistrict=""
        onSelectLocation={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'trujillo' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/No encontramos clases disponibles en “trujillo”/i)).toBeDefined();
  });
});
