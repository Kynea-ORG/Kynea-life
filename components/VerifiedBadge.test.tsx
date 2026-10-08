// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import VerifiedBadge, { VERIFIED_BADGE_DEFINITION } from './VerifiedBadge';

afterEach(cleanup);

describe('VerifiedBadge', () => {
  it('renders the label and has definition title by default', () => {
    render(<VerifiedBadge />);
    expect(screen.getByText('Profesor verificado')).toBeDefined();
    expect(screen.getByTitle(VERIFIED_BADGE_DEFINITION)).toBeDefined();
  });

  it('renders custom label when provided', () => {
    render(<VerifiedBadge label="Perfil verificado" />);
    expect(screen.getByText('Perfil verificado')).toBeDefined();
  });

  it('opens dialog with legal definition and link when clicked', () => {
    render(<VerifiedBadge />);
    const badge = screen.getByTitle(VERIFIED_BADGE_DEFINITION);
    fireEvent.click(badge);

    expect(screen.getByRole('dialog', { name: /definición de perfil verificado/i })).toBeDefined();
    expect(screen.getByText('Perfil verificado ✓')).toBeDefined();
    expect(screen.getByText(VERIFIED_BADGE_DEFINITION)).toBeDefined();
    expect(screen.getByRole('link', { name: /ver términos legales/i }).getAttribute('href')).toBe('/terminos#perfil-verificado');
  });

  it('closes dialog when clicking close button', () => {
    render(<VerifiedBadge />);
    fireEvent.click(screen.getByTitle(VERIFIED_BADGE_DEFINITION));
    expect(screen.getByRole('dialog')).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /cerrar/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
