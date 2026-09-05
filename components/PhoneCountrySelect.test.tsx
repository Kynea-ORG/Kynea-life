// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import PhoneCountrySelect from './PhoneCountrySelect';

afterEach(cleanup);

describe('PhoneCountrySelect component', () => {
  it('renders default +51 dial code and Peruvian flag', () => {
    render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);
    expect(screen.getByText('+51')).toBeDefined();
    expect(screen.getByText('🇵🇪')).toBeDefined();
  });

  it('renders US flag for +1', () => {
    render(<PhoneCountrySelect value="+1" onChange={vi.fn()} />);
    expect(screen.getByText('+1')).toBeDefined();
    expect(screen.getByText('🇺🇸')).toBeDefined();
  });

  it('opens popover when trigger is clicked', () => {
    render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByPlaceholderText('Buscar país o prefijo (+51)...')).toBeDefined();
    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('filters by phone dial prefix', () => {
    render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText('Buscar país o prefijo (+51)...');
    fireEvent.change(searchInput, { target: { value: '+54' } });

    expect(screen.getByText('Argentina')).toBeDefined();
  });

  it('navigates with ArrowDown / ArrowUp and selects with Enter', () => {
    const handleChange = vi.fn();
    render(<PhoneCountrySelect value="+51" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Buscar país o prefijo (+51)...');

    // Filtrar a Colombia (+57)
    fireEvent.change(searchInput, { target: { value: 'colomb' } });
    expect(screen.getByText('Colombia')).toBeDefined();

    // Flecha abajo y Enter
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('+57');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes popover on Escape key', () => {
    render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Buscar país o prefijo (+51)...');
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes popover on Tab key', () => {
    render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('listbox')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Buscar país o prefijo (+51)...');
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
      render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(screen.getByText('Código de país')).toBeDefined();
      expect(document.body.style.overflow).toBe('hidden');

      const closeBtn = screen.getByLabelText('Cerrar modal');
      fireEvent.click(closeBtn);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('selects a dial code from mobile modal and unlocks body scroll', () => {
      setMobileMedia(true);
      const handleChange = vi.fn();
      render(<PhoneCountrySelect value="+51" onChange={handleChange} />);

      fireEvent.click(screen.getByRole('button'));

      const searchInput = screen.getByPlaceholderText('Buscar país o prefijo (+51)...');
      fireEvent.change(searchInput, { target: { value: 'mex' } });

      const mexicoOption = screen.getByText('México');
      fireEvent.click(mexicoOption);

      expect(handleChange).toHaveBeenCalledWith('+52');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });

    it('closes mobile modal when backdrop is clicked', () => {
      setMobileMedia(true);
      render(<PhoneCountrySelect value="+51" onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeDefined();

      const backdrop = document.querySelector('.bg-neutral-900\\/60');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });
  });
});
