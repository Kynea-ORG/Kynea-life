// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ClassPrepList from './ClassPrepList';

afterEach(cleanup);

describe('ClassPrepList', () => {
  it('no se muestra si el profesor no llenó ningún campo', () => {
    const { container } = render(<ClassPrepList cls={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra una línea por categoría con su etiqueta', () => {
    render(<ClassPrepList cls={{ requirements: ['Evaluación previa'], footwear: ['Zapatillas'], toBring: ['Agua'] }} />);
    expect(screen.getByText('Antes de ir')).toBeInTheDocument();
    expect(screen.getByText('Requisitos:')).toBeInTheDocument();
    expect(screen.getByText('Evaluación previa')).toBeInTheDocument();
    expect(screen.getByText('Qué traer:')).toBeInTheDocument();
    expect(screen.getByText('Calzado: Zapatillas · Agua')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con más de 3 categorías muestra 3 y "Ver todo (N)" despliega el resto', () => {
    render(<ClassPrepList cls={{ whatYouLearn: ['Ritmos'], forWhom: 'Principiantes', requirements: ['Ninguno'], toBring: ['Agua'] }} />);
    expect(screen.getByText('Requisitos:')).toBeInTheDocument();
    expect(screen.queryByText('Qué traer:')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver todo (4)' }));
    expect(screen.getByText('Qué traer:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeInTheDocument();
  });
});
