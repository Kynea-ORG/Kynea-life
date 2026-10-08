'use client';

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';
import Link from 'next/link';

export const VERIFIED_BADGE_DEFINITION =
  'La verificación confirma que el correo electrónico asociado al perfil fue validado mediante un código enviado por KYNEA. Esto ayuda a confirmar que el perfil corresponde a una persona con acceso al correo registrado. No constituye una certificación de antecedentes, conducta, formación profesional o trayectoria.';

interface VerifiedBadgeProps {
  label?: string;
  className?: string;
  iconClassName?: string;
  interactive?: boolean;
}

export default function VerifiedBadge({
  label = 'Profesor verificado',
  className = 'text-[11px] font-bold text-pink-600 uppercase tracking-wide',
  iconClassName = 'w-[13px] h-[13px]',
  interactive = true,
}: VerifiedBadgeProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1 ${className}`}>
      <div
        className={`inline-flex items-center gap-1 ${interactive ? 'cursor-pointer hover:opacity-90' : ''}`}
        onClick={() => interactive && setOpen(prev => !prev)}
        title={VERIFIED_BADGE_DEFINITION}
      >
        <ShieldCheck className={iconClassName} />
        <span>{label}</span>
        {interactive && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Información de perfil verificado"
            className="text-pink-600/70 hover:text-pink-600 transition-colors inline-flex items-center"
            onClick={e => {
              e.stopPropagation();
              setOpen(prev => !prev);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(prev => !prev);
              }
            }}
          >
            <Info className="w-3 h-3" />
          </span>
        )}
      </div>

      {interactive && open && (
        <div
          role="dialog"
          aria-label="Definición de Perfil verificado"
          className="absolute z-50 bottom-full left-0 mb-2 w-72 max-w-[85vw] p-3.5 bg-neutral-900 text-white rounded-xl shadow-2xl text-[12px] leading-relaxed normal-case font-normal border border-neutral-700 animate-in fade-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 font-bold text-[12.5px] text-pink-400">
            <span>Perfil verificado ✓</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-neutral-200 text-[11.5px] leading-snug mb-2 font-figtree">
            {VERIFIED_BADGE_DEFINITION}
          </p>
          <Link
            href="/terminos#perfil-verificado"
            target="_blank"
            className="text-[11px] text-pink-400 underline hover:text-pink-300 transition-colors"
          >
            Ver términos legales
          </Link>
        </div>
      )}
    </div>
  );
}
