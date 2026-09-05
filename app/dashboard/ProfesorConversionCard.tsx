'use client';
import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import BecomeTeacherModal from '@/components/BecomeTeacherModal';

// Alumno equivalent of AcademiaConversionCard (profesor -> academia) — mismo
// lugar (dashboard home) por la misma razón: un alumno solo entra a
// Configuración buscando algo puntual, así que la oportunidad de
// convertirse en profesor pasaba desapercibida ahí.
//
// Sin estado "pending": a diferencia de academia (requiere revisión de
// admin), el cambio de rol acá es inmediato — ver upgradeToProfesor() en
// lib/profiles/actions.ts — así que no hay nada intermedio que mostrar.
// Reusa el mismo BecomeTeacherModal que components/Header.tsx, para que la
// confirmación sea idéntica sin importar desde dónde se entra al flujo.
export default function ProfesorConversionCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-primary-bg border border-primary/20 rounded-xl px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-neutral-900">¿Quieres enseñar en Kynea?</p>
            <p className="text-[13px] text-neutral-600 mt-0.5">
              Publica tus propias clases y gestiona tus alumnos. Conservas tu perfil y tus clases guardadas.
            </p>
            <button type="button" onClick={() => setOpen(true)} className="btn-outline btn-sm mt-3 inline-flex">
              Convertirme en profesor
            </button>
          </div>
        </div>
      </div>

      {open && <BecomeTeacherModal onClose={() => setOpen(false)} />}
    </>
  );
}
