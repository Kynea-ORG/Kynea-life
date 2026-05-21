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

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Contactar al profesor</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {!isLoggedIn ? (
          /* ── Not logged in: gate ── */
          <div className="px-6 pb-8">
            <div className="bg-purple-50 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <img src={cls.teacher.photo} alt={cls.teacher.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{cls.teacher.name}</p>
                <p className="text-xs text-gray-500">{cls.title} · {cls.district}, {cls.city}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 text-center leading-relaxed">
              Crea una cuenta gratis para ver el número de WhatsApp del profesor y coordinar directamente.
            </p>

            <div className="flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-full text-sm transition-colors">
                <Globe className="w-4 h-4" />
                Continuar con Google
              </button>
              <Link
                href={`/registro?redirect=/clases/${cls.id}`}
                className="w-full flex items-center justify-center bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 rounded-full text-sm transition-colors"
                onClick={onClose}
              >
                Registrarme con correo
              </Link>
              <p className="text-center text-xs text-gray-400">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-purple-700 font-semibold" onClick={onClose}>Inicia sesión</Link>
              </p>
            </div>
          </div>
        ) : (
          /* ── Logged in: show contact ── */
          <div className="px-6 pb-8">
            <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-2xl">
              <img src={cls.teacher.photo} alt={cls.teacher.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-bold text-gray-900 text-sm">{cls.teacher.name}</p>
                <p className="text-xs text-gray-500">{cls.title}</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700">WhatsApp del profesor</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{cls.teacher.whatsapp}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="text-xs text-gray-500 font-semibold mb-1">Mensaje pre-armado:</p>
              <p className="text-xs text-gray-700 italic leading-relaxed">
                "Hola, vi tu clase de {cls.style} en Kynea y me gustaría asistir. ¿Está disponible?"
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BC5A] text-white font-bold py-3.5 rounded-full transition-colors"
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
