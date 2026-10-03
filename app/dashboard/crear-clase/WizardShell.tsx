'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

// Armazón del wizard de crear/editar clase: header compacto + cuerpo con scroll
// interno + footer fijo, de alto = viewport. Así el profesor siempre ve los
// campos del paso Y los botones de avanzar, sin importar el tamaño de pantalla.
//
// Mobile: `fixed inset-0` cubre el shell del dashboard (su menú superior e
// inferior se ocultan en esta ruta, ver DashboardSidebar). Desktop: sticky con
// alto dvh, a la derecha del sidebar.
export default function WizardShell({
  title,
  steps,
  step,
  cancelHref,
  bannerOffset = false,
  footerNotice,
  footer,
  children,
}: {
  title: string;
  steps: { label: string }[];
  step: number;
  cancelHref: string;
  /** El layout del dashboard muestra un banner amarillo (~44 px) sobre el wizard
   * cuando la academia está en revisión: en desktop hay que restarlo del alto. */
  bannerOffset?: boolean;
  /** Mensajes de error compactos, encima de los botones y dentro del footer. */
  footerNotice?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // El scroll vive en el cuerpo, no en la ventana: al cambiar de paso vuelve arriba.
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [step]);

  const total = steps.length;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col bg-neutral-50 md:sticky md:inset-auto md:top-0 md:z-auto ${
        bannerOffset ? 'md:h-[calc(100dvh-2.75rem)]' : 'md:h-dvh'
      }`}
    >
      <header className="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 pt-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href={cancelHref}
              aria-label="Cancelar y salir"
              className="shrink-0 -ml-1 p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 active:scale-90 transition-[background-color,color,transform]"
            >
              <X className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1 flex items-baseline gap-x-3 gap-y-0 flex-wrap">
              <h1 className="text-[17px] sm:text-xl font-black leading-tight text-neutral-900">{title}</h1>
              <p className="text-[13px] text-neutral-500 truncate">
                <span className="font-semibold text-neutral-700">Paso {step + 1} de {total}</span>
                <span className="sm:hidden"> · {steps[step]?.label}</span>
              </p>
            </div>
            {/* Pasos en línea (sm+): mismo estilo que el stepper anterior */}
            <ol className="hidden sm:flex items-center gap-x-3 text-[13px] font-semibold">
              {steps.map((s, i) => (
                <li
                  key={s.label}
                  aria-current={i === step ? 'step' : undefined}
                  className={`flex items-center gap-2 transition-colors ${
                    i === step ? 'text-neutral-900' : i < step ? 'text-neutral-400' : 'text-neutral-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                      i <= step ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-400'
                    }`}
                  >
                    {i < step ? '✓' : i + 1}
                  </span>
                  <span className={i === step ? '' : 'hidden xl:inline'}>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div
            role="progressbar"
            aria-label="Progreso"
            aria-valuemin={1}
            aria-valuenow={step + 1}
            aria-valuemax={total}
            className="flex gap-1.5 mt-3"
          >
            {steps.map((s, i) => (
              <div
                key={s.label}
                className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-primary' : 'bg-neutral-100'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div ref={bodyRef} data-testid="wizard-body" className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div key={step} className="max-w-5xl mx-auto px-4 sm:px-6 py-4 animate-fade-in">
          {children}
        </div>
      </div>

      <footer
        data-testid="wizard-footer"
        className="shrink-0 border-t border-neutral-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-3"
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-2">
          {footerNotice}
          {footer}
        </div>
      </footer>
    </div>
  );
}
