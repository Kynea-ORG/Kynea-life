// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Button from './Button';

describe('Button', () => {
  afterEach(cleanup);

  it('renderiza texto y maneja clics', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Enviar</Button>);

    const btn = screen.getByRole('button', { name: 'Enviar' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deshabilita y muestra spinner cuando isLoading es true', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading loadingText="Guardando…" onClick={handleClick}>
        Guardar
      </Button>
    );

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Guardando…')).toBeInTheDocument();
    expect(screen.queryByText('Guardar')).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('aplica clases de variante y tamaño correspondientes', () => {
    const { rerender } = render(<Button variant="dark" size="sm">Continuar</Button>);
    let btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-dark');
    expect(btn.className).toContain('btn-sm');

    rerender(<Button variant="outline" size="xs">Atrás</Button>);
    btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-outline');
    expect(btn.className).toContain('btn-xs');
  });

  it('muestra iconos izquierdo y derecho en estado normal', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        Navegar
      </Button>
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});
