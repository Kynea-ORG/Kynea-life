// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ClassPrepList from './ClassPrepList';

afterEach(cleanup);

describe('ClassPrepList (mobile)', () => {
  it('no se muestra si el profesor no llenó ningún campo', () => {
    const { container } = render(<ClassPrepList cls={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra las secciones independientes con sus títulos y contenidos', () => {
    render(
      <ClassPrepList
        cls={{
          whatYouLearn: ['Paso básico', 'Musicalidad'],
          forWhom: 'Para principiantes',
          requirements: ['Evaluación previa'],
          footwear: ['Zapatillas cómodas'],
          clothing: 'Ropa deportiva',
          toBring: ['Botella de agua'],
        }}
      />
    );

    // 1. ¿Qué aprenderás?
    expect(screen.getByRole('heading', { name: '¿Qué aprenderás?' })).toBeInTheDocument();
    expect(screen.getByText('Paso básico')).toBeInTheDocument();
    expect(screen.getByText('Musicalidad')).toBeInTheDocument();

    // 2. ¿Para quién es? y Requisitos
    expect(screen.getByRole('heading', { name: '¿Para quién es?' })).toBeInTheDocument();
    expect(screen.getByText('Para principiantes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requisitos' })).toBeInTheDocument();
    expect(screen.getByText('Evaluación previa')).toBeInTheDocument();

    // 3. ¿Qué traer?
    expect(screen.getByRole('heading', { name: '¿Qué traer?' })).toBeInTheDocument();
    expect(screen.getByText('Zapatillas cómodas')).toBeInTheDocument();
    expect(screen.getByText('Ropa deportiva')).toBeInTheDocument();
    expect(screen.getByText('Botella de agua')).toBeInTheDocument();
  });

  it('muestra solo los bloques con datos', () => {
    render(<ClassPrepList cls={{ requirements: ['Ropa cómoda'] }} />);
    expect(screen.queryByRole('heading', { name: '¿Qué aprenderás?' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '¿Para quién es?' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '¿Qué traer?' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Requisitos' })).toBeInTheDocument();
    expect(screen.getByText('Ropa cómoda')).toBeInTheDocument();
  });
});
