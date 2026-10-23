// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfesorasClient from './ProfesorasClient';

afterEach(cleanup);

const { mockSetProfileIsWoman } = vi.hoisted(() => ({ mockSetProfileIsWoman: vi.fn() }));
vi.mock('@/lib/admin/actions', () => ({ setProfileIsWoman: mockSetProfileIsWoman }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const profesores = [
  { id: 'p1', name: 'Ana Pérez', slug: 'ana-perez', photoUrl: null, isWoman: true },
  { id: 'p2', name: 'Luis Gómez', slug: 'luis-gomez', photoUrl: null, isWoman: false },
];

const base = { profesores, total: 2, page: 1, totalPages: 1, search: '' };

beforeEach(() => mockSetProfileIsWoman.mockReset());

describe('ProfesorasClient', () => {
  it('lista a los profesores con su estado', () => {
    render(<ProfesorasClient {...base} />);
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Ana Pérez/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Luis Gómez/ })).not.toBeChecked();
    expect(screen.getByText(/1 profesora etiquetada/i)).toBeInTheDocument();
  });

  it('al activar el interruptor etiqueta a la profesora y actualiza al instante', async () => {
    mockSetProfileIsWoman.mockResolvedValue({ ok: true });
    render(<ProfesorasClient {...base} />);
    const sw = screen.getByRole('switch', { name: /Luis Gómez/ });
    fireEvent.click(sw);
    expect(sw).toBeChecked();
    await waitFor(() => expect(mockSetProfileIsWoman).toHaveBeenCalledWith('p2', true));
  });

  it('si el servidor falla, revierte el interruptor y muestra el error', async () => {
    mockSetProfileIsWoman.mockResolvedValue({ ok: false, error: 'Profesor no encontrado' });
    render(<ProfesorasClient {...base} />);
    const sw = screen.getByRole('switch', { name: /Luis Gómez/ });
    fireEvent.click(sw);
    await waitFor(() => expect(sw).not.toBeChecked());
    expect(await screen.findByText('Profesor no encontrado')).toBeInTheDocument();
  });

  it('avisa que falta aplicar la migración', () => {
    render(<ProfesorasClient {...base} profesores={[]} total={0} migrationPending />);
    expect(screen.getByText(/migración 63/i)).toBeInTheDocument();
  });

  it('sin resultados explica que no hay profesores', () => {
    render(<ProfesorasClient {...base} profesores={[]} total={0} search="zzz" />);
    expect(screen.getByText(/No encontramos profesores/i)).toBeInTheDocument();
  });
});
