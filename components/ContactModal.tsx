'use client';
import { useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { X, MessageCircle, Phone, Check, ShieldCheck } from 'lucide-react';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { DanceClass } from '@/lib/types';
import { buildWhatsAppMessage } from '@/lib/utils';
import { classUrl } from '@/lib/classes/helpers';
import { trackGenerateLead, trackAuthCtaClick } from '@/lib/analytics';

// Gate de registro para usuarios sin sesión — diseño propio (mockups
// handoff_modal_contactar/desktop.html + mobile.html), distinto del resto de
// variantes de este modal. Desktop: tarjeta centrada 2 columnas. Mobile:
// bottom sheet. Ambas se montan siempre; Tailwind decide cuál se muestra.
function RegisterGate({ cls, onClose }: { cls: DanceClass; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  const teacherMeta = `${cls.title} · ${cls.district}, ${cls.city}`;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-[#0D0D0D]/45 transition-opacity duration-[250ms] ease-out starting:opacity-0 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Desktop — tarjeta centrada, 2 columnas */}
      <div className="hidden md:flex absolute inset-0 items-center justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto relative w-[900px] max-w-[92vw] h-[480px] bg-white rounded-2xl border border-neutral-900 overflow-hidden flex shadow-[0_24px_64px_rgba(13,13,13,0.25)] transition-[opacity,transform] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:opacity-0 starting:translate-y-6 starting:scale-[0.97] ${
            closing ? 'opacity-0 translate-y-6 scale-[0.97]' : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          <div className="flex-1 p-12 flex flex-col justify-center relative min-w-0">
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#F2F1EE] flex items-center justify-center hover:bg-neutral-200 transition-colors active:scale-90"
            >
              <X className="w-4 h-4 text-neutral-900" />
            </button>

            <div className="flex items-center gap-1 text-[11px] font-bold text-pink-600 uppercase tracking-wide mb-3.5">
              <ShieldCheck className="w-[13px] h-[13px]" /> Profesor verificado
            </div>

            <h1 className="text-[32px] font-black text-neutral-900 tracking-tight leading-[1.08] mb-3.5">
              Contacta a tu profesor
            </h1>
            <p className="font-figtree text-[15px] text-[#4A4A47] leading-[1.55] mb-6 max-w-[380px]">
              Crea una cuenta o inicia sesión para ver el contacto del profesor y coordinar directamente.
            </p>

            <div className="flex items-center gap-3.5 bg-[#F9F8F6] border border-[#E5E4E0] rounded-xl px-4 py-3.5 mb-7 max-w-[380px]">
              <div className="relative w-14 h-14 rounded-[14px] overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
                {cls.teacher.photo ? (
                  <SmartImage src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="56px" className="object-cover" />
                ) : (
                  <span className="text-white font-black text-lg">{cls.teacher.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-[16px] text-neutral-900">{cls.teacher.name}</div>
                <div className="font-figtree text-[12px] text-[#6B6A67] whitespace-nowrap overflow-hidden text-ellipsis">{teacherMeta}</div>
              </div>
            </div>

            <div className="flex gap-3 max-w-[380px]">
              <Link
                href={`/registro?redirect=${classUrl(cls)}`}
                onClick={() => { trackAuthCtaClick({ action: 'registro', location: 'contact_modal_desktop' }); onClose(); }}
                className="flex-1 text-center py-[15px] rounded-xl border border-neutral-900 text-white font-extrabold text-[15px] bg-[#8613B9] hover:bg-[#6d0d97] transition-colors active:scale-[0.97]"
              >
                Registrarme gratis
              </Link>
              <Link
                href={`/login?redirect=${classUrl(cls)}`}
                onClick={() => { trackAuthCtaClick({ action: 'login', location: 'contact_modal_desktop' }); onClose(); }}
                className="flex-1 text-center py-[15px] rounded-xl border border-neutral-900 bg-white text-neutral-900 font-extrabold text-[15px] hover:bg-neutral-50 transition-colors active:scale-[0.97]"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="flex-1 relative bg-pink-100 overflow-hidden">
            <SmartImage src="/contactar-illustration.png" alt="" fill sizes="450px" className="object-cover object-center" />
          </div>
        </div>
      </div>

      {/* Mobile — bottom sheet */}
      <div
        className={`md:hidden absolute left-0 right-0 bottom-0 top-[180px] bg-pink-100 rounded-t-[28px] border border-neutral-900 border-b-0 overflow-hidden transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-full ${
          closing ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="absolute left-0 right-0 bottom-8 w-full h-[62%] pointer-events-none">
          <SmartImage src="/contactar-illustration.png" alt="" fill sizes="100vw" className="object-contain object-bottom" />
        </div>

        <div className="relative h-full flex flex-col px-5 pt-5 pb-7 overflow-y-auto">
          <div className="flex justify-end mb-1.5">
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 text-neutral-900" />
            </button>
          </div>

          <h1 className="text-[26px] font-black text-[#250433] tracking-tight text-center leading-[1.1] mt-2 mb-4.5 transition-[opacity,transform] duration-[450ms] ease-out starting:opacity-0 starting:translate-y-2">
            Contacta a tu profesor
          </h1>
          <p className="font-figtree text-[14.5px] text-[#340348] leading-[1.55] text-center mb-5">
            <b className="text-[#250433]">Crea una cuenta o inicia sesión para ver el contacto del profesor y coordinar directamente.</b>
          </p>

          <div className="flex items-center gap-3.5 bg-white/55 backdrop-blur-[10px] rounded-xl px-4 py-3.5 mb-5">
            <div className="relative w-20 h-20 rounded-[14px] overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
              {cls.teacher.photo ? (
                <SmartImage src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="80px" className="object-cover" />
              ) : (
                <span className="text-white font-black text-xl">{cls.teacher.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10.5px] font-bold text-pink-600 uppercase tracking-wide mb-0.5">
                <ShieldCheck className="w-3 h-3" /> Profesor verificado
              </div>
              <span className="font-extrabold text-[16px] text-neutral-900">{cls.teacher.name}</span>
              <div className="font-figtree text-[12px] text-[#4A4A47] whitespace-nowrap overflow-hidden text-ellipsis">{teacherMeta}</div>
            </div>
          </div>

          <div className="flex-1 min-h-2" />

          <div className="flex flex-col gap-2.5">
            <Link
              href={`/registro?redirect=${classUrl(cls)}`}
              onClick={() => { trackAuthCtaClick({ action: 'registro', location: 'contact_modal_mobile' }); onClose(); }}
              className="w-full text-center py-[15px] rounded-xl border border-neutral-900 text-white font-extrabold text-[15px] bg-[#8613B9] active:scale-[0.97] transition-colors"
            >
              Registrarme gratis
            </Link>
            <Link
              href={`/login?redirect=${classUrl(cls)}`}
              onClick={() => { trackAuthCtaClick({ action: 'login', location: 'contact_modal_mobile' }); onClose(); }}
              className="w-full text-center py-[15px] rounded-xl border border-neutral-900 bg-white text-neutral-900 font-extrabold text-[15px] active:scale-[0.97] transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContactModalProps {
  cls: DanceClass;
  onClose: () => void;
  isLoggedIn?: boolean;
  contactType?: 'whatsapp' | 'instagram';
}

export default function ContactModal({ cls, onClose, isLoggedIn = false, contactType = 'whatsapp' }: ContactModalProps) {
  if (!isLoggedIn) {
    return <RegisterGate cls={cls} onClose={onClose} />;
  }

  const hasWhatsapp = !!cls.teacher.whatsapp;
  const hasInstagram = !!cls.teacher.instagram;
  const whatsappUrl = hasWhatsapp
    ? buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp)
    : '';
  const instagramHandle = hasInstagram
    ? (cls.teacher.instagram!.startsWith('@') ? cls.teacher.instagram!.slice(1) : cls.teacher.instagram!)
    : '';

  const hasContact = contactType === 'instagram' ? hasInstagram : hasWhatsapp;

  return (
    <ExistingGate
      cls={cls}
      onClose={onClose}
      contactType={contactType}
      hasContact={hasContact}
      whatsappUrl={whatsappUrl}
      instagramHandle={instagramHandle}
    />
  );
}

// Variantes "logueado" (sin contacto configurado / con contacto) — sin
// cambios de diseño, fuera del alcance del rediseño del gate de registro.
function ExistingGate({
  cls, onClose, contactType, hasContact, whatsappUrl, instagramHandle,
}: {
  cls: DanceClass;
  onClose: () => void;
  contactType: 'whatsapp' | 'instagram';
  hasContact: boolean;
  whatsappUrl: string;
  instagramHandle: string;
}) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const [confirmed, setConfirmed] = useState(false);
  const handleContactClick = () => {
    trackGenerateLead({
      channel: contactType, classId: cls.id, className: cls.title, classStyle: cls.style,
      teacherId: cls.teacher.id, teacherName: cls.teacher.name,
    });
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

        {!hasContact ? (
          /* ── Logueado pero sin contacto configurado ── */
          <div className="px-6 pb-8">
            <div className="flex items-center gap-3 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              {cls.teacher.photo ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                  <SmartImage src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="48px" className="object-cover" />
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
                  <SmartImage src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="48px" className="object-cover" />
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
                    <InstagramIcon className="w-4 h-4 text-[#E1306C]" />
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
                  {confirmed ? <Check className="w-5 h-5 animate-fade-in" /> : <InstagramIcon className="w-5 h-5" />}
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
