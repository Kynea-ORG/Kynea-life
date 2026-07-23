'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, MessageCircle, Globe, Phone, Check } from 'lucide-react';

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}
import { DanceClass } from '@/lib/types';
import { buildWhatsAppMessage } from '@/lib/utils';

interface ContactModalProps {
  cls: DanceClass;
  onClose: () => void;
  isLoggedIn?: boolean;
  contactType?: 'whatsapp' | 'instagram';
}

export default function ContactModal({ cls, onClose, isLoggedIn = false, contactType = 'whatsapp' }: ContactModalProps) {
  const hasWhatsapp = !!cls.teacher.whatsapp;
  const hasInstagram = !!cls.teacher.instagram;
  const whatsappUrl = hasWhatsapp
    ? buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp)
    : '';
  const instagramHandle = hasInstagram
    ? (cls.teacher.instagram!.startsWith('@') ? cls.teacher.instagram!.slice(1) : cls.teacher.instagram!)
    : '';

  const hasContact = contactType === 'instagram' ? hasInstagram : hasWhatsapp;

  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const [confirmed, setConfirmed] = useState(false);
  const handleContactClick = () => {
    setConfirmed(true);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out starting:opacity-0 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-[opacity,transform] duration-200 ease-out starting:opacity-0 starting:scale-95 ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[20px] font-bold text-neutral-900">Contactar al profesor</h2>
          <button onClick={handleClose} className="p-2 hover:bg-neutral-100 rounded-md transition-colors active:scale-90">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {!isLoggedIn ? (
          /* ── Gate de registro (no logueado) ── */
          <div className="px-6 pb-8">
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                {cls.teacher.photo ? (
                  <Image src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="40px" className="object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center text-lg font-bold text-neutral-500">
                    {cls.teacher.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{cls.teacher.name}</p>
                <p className="text-[13px] text-neutral-500">{cls.title} · {cls.district}, {cls.city}</p>
              </div>
            </div>

            <p className="text-[15px] text-neutral-600 mb-6 text-center leading-relaxed">
              Crea una cuenta gratis para ver el contacto del profesor y coordinar directamente.
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
        ) : !hasContact ? (
          /* ── Logueado pero sin contacto configurado ── */
          <div className="px-6 pb-8">
            <div className="flex items-center gap-3 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              {cls.teacher.photo ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                  <Image src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="48px" className="object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-bold text-neutral-500">
                  {cls.teacher.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-neutral-900 text-[15px]">{cls.teacher.name}</p>
                <p className="text-[13px] text-neutral-500">{cls.title}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-[14px] font-semibold text-amber-800 mb-1">
                {contactType === 'instagram' ? 'Instagram no disponible' : 'WhatsApp no disponible'}
              </p>
              <p className="text-[13px] text-amber-700 leading-relaxed">
                Este profesor aún no ha agregado su {contactType === 'instagram' ? 'Instagram' : 'número de WhatsApp'}. Intenta más tarde o explora otras clases similares.
              </p>
            </div>

            <button onClick={handleClose} className="w-full btn-outline">Entendido</button>
          </div>
        ) : (
          /* ── Logueado + tiene contacto (fallback — normalmente abre directo) ── */
          <div className="px-6 pb-8">
            <div className="flex items-center gap-3 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              {cls.teacher.photo ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                  <Image src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="48px" className="object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-lg font-bold text-neutral-500">
                  {cls.teacher.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-neutral-900 text-[15px]">{cls.teacher.name}</p>
                <p className="text-[13px] text-neutral-500">{cls.title}</p>
              </div>
            </div>

            {contactType === 'instagram' ? (
              <>
                <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <IgIcon className="w-4 h-4 text-[#E1306C]" />
                    <span className="text-[13px] font-semibold text-[#E1306C]">Instagram del profesor</span>
                  </div>
                  <p className="text-[20px] font-bold text-neutral-900">{cls.teacher.instagram}</p>
                </div>
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleContactClick}
                  className="w-full flex items-center justify-center gap-2 bg-[#E1306C] hover:bg-[#c9225a] text-white font-bold py-3.5 rounded-btn transition-colors active:scale-[0.97]"
                >
                  {confirmed ? <Check className="w-5 h-5 animate-fade-in" /> : <IgIcon className="w-5 h-5" />}
                  {confirmed ? 'Abriendo…' : 'Abrir Instagram'}
                </a>
              </>
            ) : (
              <>
                <div className="bg-green-bg border border-green-bg rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-green-text" />
                    <span className="text-[13px] font-semibold text-green-text">WhatsApp del profesor</span>
                  </div>
                  <p className="text-[20px] font-bold text-neutral-900">{cls.teacher.whatsapp}</p>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleContactClick}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BC5A] text-white font-bold py-3.5 rounded-btn transition-colors active:scale-[0.97]"
                >
                  {confirmed ? <Check className="w-5 h-5 animate-fade-in" /> : <MessageCircle className="w-5 h-5" />}
                  {confirmed ? 'Abriendo…' : 'Abrir WhatsApp'}
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
