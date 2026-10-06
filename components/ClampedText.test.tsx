// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ClampedText from './ClampedText';

afterEach(cleanup);

const LONG = 'Descubre el arte y la magia de las castañuelas. '.repeat(8);

describe('ClampedText', () => {
  it('recorta a 4 líneas en mobile y ofrece "Leer más" cuando el texto es largo', () => {
    render(<ClampedText text={LONG} data-testid="p" />);
    expect(screen.getByTestId('p').className).toContain('line-clamp-4');
    expect(screen.getByRole('button', { name: 'Leer más' })).toBeInTheDocument();
  });

  it('un texto de largo medio se recorta en mobile pero se ve completo en desktop (sin botón ahí)', () => {
    render(<ClampedText text={LONG} data-testid="p" />);
    expect(screen.getByTestId('p').className).toContain('lg:line-clamp-none');
    expect(screen.getByRole('button', { name: 'Leer más' }).className).toContain('lg:hidden');
  });

  it('un texto muy largo también se recorta en desktop (6 líneas) y el botón se ve en ambos', () => {
    render(<ClampedText text={'a'.repeat(1100)} data-testid="p" />);
    const p = screen.getByTestId('p');
    expect(p.className).toContain('line-clamp-4');
    expect(p.className).toContain('lg:line-clamp-6');
    const btn = screen.getByRole('button', { name: 'Leer más' });
    expect(btn.className).toContain('lg:inline-block');
    expect(btn.className).not.toContain('lg:hidden');
  });

  it('un texto corto se muestra completo, sin botón', () => {
    render(<ClampedText text="Clase corta." data-testid="p" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('p').className).not.toContain('line-clamp-4');
  });

  it('"Leer más" expande en el mismo lugar y "Leer menos" vuelve a recortar', () => {
    render(<ClampedText text={LONG} data-testid="p" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer más' }));
    expect(screen.getByTestId('p').className).not.toContain('line-clamp-4');
    fireEvent.click(screen.getByRole('button', { name: 'Leer menos' }));
    expect(screen.getByTestId('p').className).toContain('line-clamp-4');
  });

  it('conserva los saltos de línea', () => {
    render(<ClampedText text={'uno\ndos'} data-testid="p" />);
    expect(screen.getByTestId('p').className).toContain('whitespace-pre-line');
  });
});
