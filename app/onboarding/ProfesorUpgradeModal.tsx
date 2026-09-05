'use client';
import { useState, useEffect } from 'react';
import { LayoutGrid, MessageCircle, Star, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';

interface ProfesorUpgradeModalProps {
  stage: 'preparing' | 'success';
  name?: string;
  onGoToDashboard: () => void;
}

export const PREPARING_MESSAGES = [
  'Estamos preparando todo para convertirte en profesor...',
  'Configurando tus herramientas de enseñanza...',
  '¡Casi listo! Guardando tus preferencias...',
];

export const MESSAGE_DURATION_MS = 1200;
export const TOTAL_PREPARING_MIN_TIME_MS = PREPARING_MESSAGES.length * MESSAGE_DURATION_MS;

const BENEFITS = [
  { Icon: LayoutGrid, text: 'Publica y gestiona tus propias clases independientes' },
  { Icon: MessageCircle, text: 'Recibe consultas de alumnos directo a tu WhatsApp' },
  { Icon: Star, text: 'Perfil público de profesor en el catálogo de Kynea' },
];

export default function ProfesorUpgradeModal({
  stage,
  name,
  onGoToDashboard,
}: ProfesorUpgradeModalProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const firstName = name?.trim().split(' ')[0] || '';

  // Muestra cada uno de los 3 mensajes exactamente 1 sola vez en secuencia
  // y se queda en el último mensaje si la carga continúa
  useEffect(() => {
    if (stage !== 'preparing') return;

    const timeouts = PREPARING_MESSAGES.slice(1).map((_, idx) => {
      const nextIndex = idx + 1;
      return setTimeout(() => {
        setMessageIndex(nextIndex);
      }, nextIndex * MESSAGE_DURATION_MS);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [stage]);

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[24px] border border-neutral-900 shadow-2xl max-w-md sm:max-w-[480px] w-full p-8 text-center transition-all duration-300">
        {stage === 'preparing' ? (
          <div className="py-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-xs relative">
              <GraduationCap className="w-8 h-8 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-xs">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              </div>
            </div>

            <div className="min-h-[64px] flex items-center justify-center mb-3 px-2">
              <p
                key={messageIndex}
                className="text-lg md:text-xl font-black text-neutral-900 tracking-tight leading-snug animate-fade-in"
              >
                {PREPARING_MESSAGES[messageIndex]}
              </p>
            </div>

            <p className="text-[14px] text-neutral-500 mb-6">
              Solo tomará unos segundos. Por favor espera.
            </p>

            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: messageIndex === 0 ? '33%' : messageIndex === 1 ? '66%' : '95%',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <p className="text-5xl mb-3 animate-bounce">🎉</p>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">
              <span className="block">¡Felicidades{firstName ? `, ${firstName}` : ''}!</span>
              <span className="block text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                Ahora eres un profesor
              </span>
            </h2>
            <p className="text-[15px] text-neutral-600 mb-6 leading-relaxed">
              Ya puedes compartir tu talento y publicar tus clases en Kynea.
            </p>

            <ul className="flex flex-col gap-3.5 text-left mb-7">
              {BENEFITS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3.5">
                  <div className="w-8 h-8 bg-primary-bg rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[14px] font-semibold text-neutral-800 leading-snug">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onGoToDashboard}
              className="btn-dark w-full flex items-center justify-center gap-2 cursor-pointer text-[15px] py-3.5"
            >
              Ir a mi dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
