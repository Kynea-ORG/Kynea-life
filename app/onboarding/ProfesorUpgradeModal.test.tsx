// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import ProfesorUpgradeModal, {
  PREPARING_MESSAGES,
  MESSAGE_DURATION_MS,
  TOTAL_PREPARING_MIN_TIME_MS,
} from './ProfesorUpgradeModal';

describe('ProfesorUpgradeModal component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the first message initially when stage is preparing', () => {
    render(
      <ProfesorUpgradeModal
        stage="preparing"
        name="María López"
        onGoToDashboard={vi.fn()}
      />
    );

    expect(screen.getByText(PREPARING_MESSAGES[0])).toBeDefined();
    expect(screen.queryByText(PREPARING_MESSAGES[1])).toBeNull();
    expect(screen.queryByText(PREPARING_MESSAGES[2])).toBeNull();
  });

  it('advances sequentially through the 3 messages with 1200ms duration each', () => {
    render(
      <ProfesorUpgradeModal
        stage="preparing"
        name="Carlos"
        onGoToDashboard={vi.fn()}
      />
    );

    // Inicial: Mensaje 1
    expect(screen.getByText(PREPARING_MESSAGES[0])).toBeDefined();

    // Avanza a mensaje 2 (1200ms)
    act(() => {
      vi.advanceTimersByTime(MESSAGE_DURATION_MS);
    });
    expect(screen.getByText(PREPARING_MESSAGES[1])).toBeDefined();
    expect(screen.queryByText(PREPARING_MESSAGES[0])).toBeNull();

    // Avanza a mensaje 3 (2400ms acumulados)
    act(() => {
      vi.advanceTimersByTime(MESSAGE_DURATION_MS);
    });
    expect(screen.getByText(PREPARING_MESSAGES[2])).toBeDefined();
    expect(screen.queryByText(PREPARING_MESSAGES[1])).toBeNull();
  });

  it('stays on the 3rd message if loading continues past the minimum time without looping or repeating', () => {
    render(
      <ProfesorUpgradeModal
        stage="preparing"
        name="Carlos"
        onGoToDashboard={vi.fn()}
      />
    );

    // Avanza a mensaje 3
    act(() => {
      vi.advanceTimersByTime(MESSAGE_DURATION_MS * 2);
    });
    expect(screen.getByText(PREPARING_MESSAGES[2])).toBeDefined();

    // Avanza 1.2s más (tiempo total 3600ms = TOTAL_PREPARING_MIN_TIME_MS)
    act(() => {
      vi.advanceTimersByTime(MESSAGE_DURATION_MS);
    });
    // Sigue en el 3er mensaje
    expect(screen.getByText(PREPARING_MESSAGES[2])).toBeDefined();
    expect(screen.queryByText(PREPARING_MESSAGES[0])).toBeNull();

    // Avanza varios segundos adicionales simulando carga lenta de backend
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    // Debe PERMANECER en el 3er mensaje y no reiniciar el ciclo
    expect(screen.getByText(PREPARING_MESSAGES[2])).toBeDefined();
    expect(screen.queryByText(PREPARING_MESSAGES[0])).toBeNull();
    expect(screen.queryByText(PREPARING_MESSAGES[1])).toBeNull();
  });

  it('renders congratulations screen when stage is success', () => {
    const handleGoToDashboard = vi.fn();
    render(
      <ProfesorUpgradeModal
        stage="success"
        name="José Armando Ñiquen"
        onGoToDashboard={handleGoToDashboard}
      />
    );

    expect(screen.getByText(/¡Felicidades, José!/i)).toBeDefined();
    expect(screen.getByText(/Ahora eres un profesor/i)).toBeDefined();
    expect(screen.getByText(/Ya puedes compartir tu talento y publicar tus clases en Kynea/i)).toBeDefined();
    expect(screen.getByText(/Publica y gestiona tus propias clases independientes/i)).toBeDefined();
    expect(screen.getByText(/Recibe consultas de alumnos directo a tu WhatsApp/i)).toBeDefined();
    expect(screen.getByText(/Perfil público de profesor en el catálogo de Kynea/i)).toBeDefined();

    const button = screen.getByRole('button', { name: /Ir a mi dashboard/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(handleGoToDashboard).toHaveBeenCalledTimes(1);
  });

  it('exports valid timing constants where total time equals messages * duration', () => {
    expect(PREPARING_MESSAGES).toHaveLength(3);
    expect(MESSAGE_DURATION_MS).toBe(1200);
    expect(TOTAL_PREPARING_MIN_TIME_MS).toBe(3600);
  });
});
