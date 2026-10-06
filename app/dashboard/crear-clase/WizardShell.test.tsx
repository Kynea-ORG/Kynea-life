// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import WizardShell from './WizardShell';

afterEach(cleanup);

const STEPS = [
  { label: 'Información básica' },
  { label: 'Horario y ubicación' },
  { label: 'Precio y detalles' },
  { label: 'Revisión y publicación' },
];

function setup(over: Partial<React.ComponentProps<typeof WizardShell>> = {}) {
  return render(
    <WizardShell
      title="Crear clase"
      steps={STEPS}
      step={1}
      cancelHref="/dashboard/mis-clases"
      footer={<button>Continuar</button>}
      {...over}
    >
      <p>contenido del paso</p>
    </WizardShell>,
  );
}

describe('WizardShell', () => {
  it('muestra el título y "Paso N de M" con el nombre del paso actual', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Crear clase' })).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument();
    // el nombre del paso aparece en el subtítulo compacto
    expect(screen.getAllByText('Horario y ubicación').length).toBeGreaterThan(0);
  });

  it('expone el progreso como progressbar accesible', () => {
    setup({ step: 2 });
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
  });

  it('el botón ✕ lleva a cancelHref', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Cancelar y salir' })).toHaveAttribute('href', '/dashboard/mis-clases');
  });

  it('el footer queda FUERA del contenedor con scroll; el contenido, dentro', () => {
    setup();
    const body = screen.getByTestId('wizard-body');
    expect(body.className).toContain('overflow-y-auto');
    expect(within(body).getByText('contenido del paso')).toBeInTheDocument();
    expect(within(body).queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('el footer está después del cuerpo en el DOM y no hace scroll', () => {
    setup();
    const body = screen.getByTestId('wizard-body');
    const footer = screen.getByTestId('wizard-footer');
    expect(body.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(footer.className).not.toContain('overflow-y-auto');
    expect(footer.className).toContain('shrink-0');
  });

  it('la raíz ocupa el viewport: fija en mobile, alto dvh sticky en desktop', () => {
    const { container } = setup();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('inset-0');
    expect(root.className).toContain('md:sticky');
    expect(root.className).toContain('md:h-dvh');
  });

  it('con bannerOffset resta la altura del banner de academia en desktop', () => {
    const { container } = setup({ bannerOffset: true });
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('md:h-[calc(100dvh-2.75rem)]');
    expect(root.className).not.toContain('md:h-dvh');
  });

  it('al cambiar de paso el cuerpo vuelve arriba', () => {
    const { rerender } = setup({ step: 0 });
    const body = screen.getByTestId('wizard-body');
    const scrollTo = vi.fn();
    body.scrollTo = scrollTo as unknown as typeof body.scrollTo;
    rerender(
      <WizardShell title="Crear clase" steps={STEPS} step={1} cancelHref="/x" footer={<button>Continuar</button>}>
        <p>contenido del paso</p>
      </WizardShell>,
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('muestra el aviso de error del footer encima de los botones, dentro del footer', () => {
    setup({ footerNotice: <p>Falta el título</p> });
    const footer = screen.getByTestId('wizard-footer');
    expect(within(footer).getByText('Falta el título')).toBeInTheDocument();
  });
});
