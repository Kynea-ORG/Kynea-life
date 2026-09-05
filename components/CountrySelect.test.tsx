// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import CountrySelect from './CountrySelect';

afterEach(cleanup);

describe('CountrySelect component', () => {
  it('renders trigger with placeholder when no value is provided', () => {
    render(<CountrySelect value="" onChange={vi.fn()} placeholder="Seleccionar país..." />);
    expect(screen.getByText('Seleccionar país...')).toBeDefined();
  });

  it('renders selected country flag and name', () => {
    render(<CountrySelect value="Perú" onChange={vi.fn()} />);
    expect(screen.getByText('Perú')).toBeDefined();
    expect(screen.getByText('🇵🇪')).toBeDefined();
  });

  it('opens popover when trigger is clicked', () => {
    render(<CountrySelect value="" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Buscar país...')).toBeDefined();
    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('filters countries when typing in search input', () => {
    render(<CountrySelect value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText('Buscar país...');
    fireEvent.change(searchInput, { target: { value: 'colomb' } });

    expect(screen.getByText('Colombia')).toBeDefined();
    expect(screen.queryByText('Argentina')).toBeNull();
  });

  it('navigates with ArrowDown / ArrowUp and selects with Enter', () => {
    const handleChange = vi.fn();
    render(<CountrySelect value="" onChange={handleChange} />);

    // Abrir con trigger
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Buscar país...');

    // Filtrar a una opción
    fireEvent.change(searchInput, { target: { value: 'boliv' } });
    expect(screen.getByText('Bolivia')).toBeDefined();

    // Navegar y presionar Enter
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('Bolivia');
    // Popover debe cerrarse tras seleccionar
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes popover on Escape key', () => {
    render(<CountrySelect value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Buscar país...');
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes popover on Tab key', () => {
    render(<CountrySelect value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Buscar país...');
    fireEvent.keyDown(searchInput, { key: 'Tab' });

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  describe('Mobile bottom sheet modal (< 768px)', () => {
    const originalMatchMedia = window.matchMedia;

    function setMobileMedia(isMobile: boolean) {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: isMobile,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      document.body.style.overflow = '';
    });

    it('renders dialog modal, locks body scroll and closes with X button', () => {
      setMobileMedia(true);
      render(<CountrySelect value="" onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button'));

      // Debe abrir como dialog modal
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(screen.getByText('Seleccionar país')).toBeDefined();
      expect(document.body.style.overflow).toBe('hidden');

      // Cerrar con botón X
      const closeBtn = screen.getByLabelText('Cerrar modal');
      fireEvent.click(closeBtn);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('selects a country from mobile modal and unlocks body scroll', () => {
      setMobileMedia(true);
      const handleChange = vi.fn();
      render(<CountrySelect value="" onChange={handleChange} />);

      fireEvent.click(screen.getByRole('button'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre o código...');
      fireEvent.change(searchInput, { target: { value: 'chile' } });

      const chileOption = screen.getByText('Chile');
      fireEvent.click(chileOption);

      expect(handleChange).toHaveBeenCalledWith('Chile');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('closes mobile modal when backdrop is clicked', () => {
      setMobileMedia(true);
      render(<CountrySelect value="" onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeDefined();

      // Backdrop tiene aria-hidden="true"
      const backdrop = document.querySelector('.bg-neutral-900\\/60');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });
  });
});
