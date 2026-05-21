'use client';
import { useState } from 'react';
import Link from 'next/link';
import { X, MessageCircle, Globe, Phone } from 'lucide-react';
import { DanceClass } from '@/lib/types';
import { buildWhatsAppMessage } from '@/lib/mockData';

interface ContactModalProps {
  cls: DanceClass;
  onClose: () => void;
  isLoggedIn?: boolean;
}

export default function ContactModal({ cls, onClose, isLoggedIn = false }: ContactModalProps) {
  const whatsappUrl = buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp, cls.title);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[20px] font-bold text-neutral-900">Contactar al profesor</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {!isLoggedIn ? (
          /* ── Gate de registro (no logueado) ── */
          <div className="px-6 pb-8">
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <img src={cls.teacher.photo} alt={cls.teacher.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{cls.teacher.name}</p>
                <p className="text-[13px] text-neutral-500">{cls.title} · {cls.district}, {cls.city}</p>
              </div>
            </div>

            <p className="text-[15px] text-neutral-600 mb-6 text-center leading-relaxed">
              Crea una cuenta gratis para ver el número de WhatsApp del profesor y coordinar directamente.
            </p>

            <div className="flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 btn-outline">
                <Globe className="w-4 h-4" />
                Continuar con Google
              </button>
              <Link
                href={`/registro?redirect=/clases/${cls.id}`}
                className="w-full flex items-center justify-center btn-dark"
                onClick={onClose}
              >
                Registrarme con correo
              </Link>
              <p className="text-center text-[13px] text-neutral-400">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-neutral-900 font-semibold hover:underline" onClick={onClose}>
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* ── Logueado: mostrar contacto ── */
          <div className="px-6 pb-8">
            <div className="flex items-center gap-3 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <img src={cls.teacher.photo} alt={cls.teacher.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-bold text-neutral-900 text-[15px]">{cls.teacher.name}</p>
                <p className="text-[13px] text-neutral-500">{cls.title}</p>
              </div>
            </div>

            <div className="bg-green-bg border border-green-bg rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-green-text" />
                <span className="text-[13px] font-semibold text-green-text">WhatsApp del profesor</span>
              </div>
              <p className="text-[20px] font-bold text-neutral-900">{cls.teacher.whatsapp}</p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-5">
              <p className="text-[13px] text-neutral-500 font-semibold mb-1">Mensaje sugerido:</p>
              <p className="text-[13px] text-neutral-700 italic leading-relaxed">
                "Hola, vi tu clase de {cls.style} en Kynea y me gustaría asistir. ¿Está disponible?"
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BC5A] text-white font-bold py-3.5 rounded-btn transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Abrir WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
