// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ClassPrepDesktop from './ClassPrepDesktop';

afterEach(cleanup);

describe('ClassPrepDesktop ("¿Qué aprenderás?" y "Antes de ir", solo desktop)', () => {
  it('no se muestra si no hay ningún dato', () => {
    const { container } = render(<ClassPrepDesktop cls={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lista lo que se aprende y, con más de 4 puntos, ofrece "Mostrar los N puntos"', () => {
    render(<ClassPrepDesktop cls={{ whatYouLearn: ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'] }} />);
    expect(screen.getByRole('heading', { name: '¿Qué aprenderás?' })).toBeInTheDocument();
    expect(screen.getByText('d4')).toBeInTheDocument();
    expect(screen.queryByText('e5')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar los 6 puntos' }));
    expect(screen.getByText('f6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toBeInTheDocument();
  });

  it('con 4 puntos o menos no hay botón', () => {
    render(<ClassPrepDesktop cls={{ whatYouLearn: ['a1', 'b2'] }} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('"Antes de ir": requisitos y qué traer como chips', () => {
    render(<ClassPrepDesktop cls={{ requirements: ['Sin experiencia previa'], footwear: ['Zapatos de flamenco'], clothing: 'Ropa cómoda', toBring: ['Agua'] }} />);
    expect(screen.getByRole('heading', { name: 'Antes de ir' })).toBeInTheDocument();
    expect(screen.getByText('Sin experiencia previa')).toBeInTheDocument();
    expect(screen.getByText('Calzado: Zapatos de flamenco')).toBeInTheDocument();
    expect(screen.getByText('Ropa: Ropa cómoda')).toBeInTheDocument();
    expect(screen.getByText('Agua')).toBeInTheDocument();
  });

  it('"Para quién" va como texto', () => {
    render(<ClassPrepDesktop cls={{ forWhom: 'Personas que quieren empezar desde cero' }} />);
    expect(screen.getByText('PARA QUIÉN')).toBeInTheDocument();
    expect(screen.getByText('Personas que quieren empezar desde cero')).toBeInTheDocument();
  });

  it('solo se ve desde lg', () => {
    render(<ClassPrepDesktop cls={{ requirements: ['x'] }} />);
    expect(screen.getByTestId('class-prep-desktop').className).toContain('hidden lg:block');
  });
});
