'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SmartImage from '@/components/SmartImage';
import Header from '@/components/Header';
import { UserPlus, CalendarPlus, MessageCircle, ChevronDown, ShieldCheck } from 'lucide-react';
import { trackAuthCtaClick } from '@/lib/analytics';

const HERO_LINES = ['Baila.', 'Enseña.', 'Crece.'] as const;

const STEPS = [
  { n: '1', Icon: UserPlus,      title: 'Crea tu perfil',       text: 'Cuéntanos tu experiencia, estilos que enseñas y datos de contacto. Toma un par de minutos.' },
  { n: '2', Icon: CalendarPlus,  title: 'Publica tu clase',     text: 'Agrega horarios, ubicación y precio. Queda visible al instante, sin revisión manual.' },
  { n: '3', Icon: MessageCircle, title: 'Alumnos te contactan', text: 'Te escriben directo por WhatsApp o Instagram — tú decides cómo cerrar la inscripción.' },
];

const FAQS = [
  { q: '¿Tiene algún costo publicar mis clases?', a: 'No. Publicar y mantener tu perfil en Kynea es gratis, sin comisiones sobre lo que cobras a tus alumnos.' },
  { q: '¿Cómo me contactan los alumnos?', a: 'Directo por WhatsApp o Instagram, con el contacto que tú configures en tu perfil — Kynea no intermedia el pago ni la comunicación.' },
  { q: '¿Puedo editar mi clase después de publicarla?', a: 'Sí, desde tu panel puedes editar horarios, precio, ubicación o pausar la clase cuando quieras.' },
  { q: '¿Necesito tener un local propio?', a: 'No — puedes publicar clases en un local, un parque, o cualquier espacio donde dictes, indicando la dirección real.' },
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const STYLE_TAG_TONES = {
  gold:  'bg-[#E9C72A] text-neutral-900 border-neutral-900',
  white: 'bg-white text-neutral-900 border-neutral-900',
  dark:  'bg-neutral-900 text-white border-white/15',
} as const;

/** Etiqueta tipo sticker — el mosaico de estilos de baile alrededor de la ilustración. */
function StyleTag({
  text, tone, className = '', delay = 0, mounted, float = 'slow',
}: {
  text: string; tone: keyof typeof STYLE_TAG_TONES; className?: string; delay?: number; mounted: boolean; float?: 'slow' | 'slow2';
}) {
  return (
    <span
      className={`absolute inline-flex items-center px-4 py-2 rounded-full border-2 text-[12.5px] font-black uppercase tracking-wide shadow-lg whitespace-nowrap transition-[opacity,transform] duration-500 ease-out ${
        float === 'slow' ? 'animate-float-slow' : 'animate-float-slow-2'
      } ${STYLE_TAG_TONES[tone]} ${className} ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {text}
    </span>
  );
}

/** Revela su contenido con un fade + subida al entrar en viewport. Se dispara una sola vez. */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Número que cuenta de 0 a su valor final la primera vez que entra en viewport. */
function CountUp({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState('0');
  const started = useRef(false);

  useEffect(() => {
    const numeric = parseInt(value, 10);
    const suffix = value.replace(/^[0-9]+/, '');
    const el = ref.current;
    if (!el || Number.isNaN(numeric)) return;

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;

      if (prefersReducedMotion()) { setDisplay(value); return; }

      const duration = 1100;
      const start = performance.now();
      function tick(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(`${Math.round(eased * numeric)}${suffix}`);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <p ref={ref} className={className}>{display}</p>;
}

export default function BeneficiosClient({
  teacherCount, classCount, cityCount,
}: {
  teacherCount: number; classCount: number; cityCount: number;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <div className="bg-pink-800 relative overflow-hidden">
        <Header transparent={true} />

        {/* Resplandor ambiental morado detrás de la ilustración — mismos tonos del DS */}
        <div
          className="hidden lg:block absolute top-1/2 right-0 w-[720px] h-[720px] -translate-y-1/2 translate-x-1/4 rounded-full bg-pink-400/25 blur-[110px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Foco cálido tipo luz de escenario, cayendo sobre la bailarina */}
        <div
          className="hidden lg:block absolute top-[-6%] right-[18%] w-[420px] h-[560px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(233,199,42,0.4) 0%, rgba(233,199,42,0.14) 40%, transparent 72%)', filter: 'blur(30px)' }}
          aria-hidden="true"
        />

        {/* Viñeta — oscurece los bordes para darle dramatismo al foco de luz */}
        <div
          className="hidden lg:block absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 75% 70% at 68% 40%, transparent 45%, rgba(0,0,0,0.35) 100%)' }}
          aria-hidden="true"
        />

        <div className="max-w-[1200px] mx-auto px-6 pt-14 pb-16 lg:pt-16 lg:pb-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Copy */}
            <div className="relative z-10">
              <h1 className="mb-5">
                {HERO_LINES.map((line, i) => (
                  <span
                    key={line}
                    className={`block text-[36px] lg:text-[64px] font-black tracking-tighter leading-[0.94] transition-[opacity,transform] duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${i === HERO_LINES.length - 1 ? '' : 'text-white'}`}
                    style={{ transitionDelay: `${80 + i * 110}ms`, color: i === HERO_LINES.length - 1 ? '#E9C72A' : undefined }}
                  >
                    {line}
                  </span>
                ))}
              </h1>

              <p
                className={`text-[16px] lg:text-[18px] text-white/75 mb-7 leading-relaxed max-w-md transition-[opacity,transform] duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '440ms' }}
              >
                Profesores de salsa, hip hop, ballet, breaking y más ya publican gratis en Kynea — sin comisiones, sin trámites. Sube tu clase y llega a cientos de alumnos en toda Latinoamérica.
              </p>

              <div
                className={`flex flex-wrap items-center gap-x-8 gap-y-4 pb-7 mb-7 border-b border-white/15 transition-[opacity,transform] duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '540ms' }}
              >
                <Link
                  href="/unete"
                  onClick={() => trackAuthCtaClick({ action: 'registro', location: 'beneficios_hero' })}
                  className="btn-hero-white btn-cta-ring"
                >
                  <span>Publica tu primera clase →</span>
                </Link>

                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(233,199,42,0.15)' }}>
                    <ShieldCheck className="w-[18px] h-[18px]" style={{ color: '#E9C72A' }} />
                  </span>
                  <span className="text-[13px] leading-tight">
                    <span className="block font-bold text-white">Sé un profesor verificado</span>
                    <span className="block text-white/60">Confianza desde el primer momento</span>
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center gap-8 lg:gap-10 transition-[opacity,transform] duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '640ms' }}
              >
                {[
                  { value: `${teacherCount}+`, label: 'Profesores activos' },
                  { value: `${classCount}+`,   label: 'Clases publicadas' },
                  { value: `${cityCount}+`,    label: 'Ciudades' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <CountUp value={stat.value} className="text-[24px] lg:text-[32px] font-black text-white tracking-tighter tabular-nums leading-none" />
                    <p className="text-[12px] lg:text-[13px] text-white/55 mt-1.5 leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ilustración desktop + mosaico de estilos — bleed a la derecha, imagen estática (sin motion), pegada al fondo */}
            <div className="hidden lg:block relative h-[640px]">
              <StyleTag text="Salsa" tone="gold" mounted={mounted} delay={0} float="slow" className="top-[32%] left-[-3%] -rotate-[8deg] z-20" />
              <StyleTag text="Breaking" tone="gold" mounted={mounted} delay={300} float="slow2" className="bottom-[10%] -right-6 rotate-[7deg] z-20" />

              <div className="absolute -bottom-24 right-[-2%] w-[92%] max-w-none pointer-events-none z-10">
                <SmartImage src="/Bg-Registro-profesores-Mobile.png" alt="" width={2108} height={1664} className="w-full h-auto" />
              </div>

              <StyleTag text="Hip Hop" tone="white" mounted={mounted} delay={150} float="slow2" className="top-[28%] right-[2%] rotate-[6deg] z-20" />
              <StyleTag text="Ballet" tone="dark" mounted={mounted} delay={450} float="slow" className="top-[48%] -left-6 -rotate-[5deg] z-20" />
              <StyleTag text="Flamenco" tone="dark" mounted={mounted} delay={600} float="slow" className="top-[68%] -right-10 rotate-[10deg] z-20" />
              <StyleTag text="Contemporáneo" tone="white" mounted={mounted} delay={750} float="slow2" className="bottom-[4%] left-[4%] -rotate-[4deg] z-20" />
            </div>
          </div>

          {/* Ilustración mobile + mosaico alrededor de la imagen, pegada al fondo */}
          <div className="lg:hidden relative mt-6 h-[240px]">
            <StyleTag text="Salsa" tone="gold" mounted={mounted} delay={100} float="slow" className="top-[18%] right-[14%] -rotate-[7deg] scale-90 z-20" />
            <StyleTag text="Hip Hop" tone="white" mounted={mounted} delay={350} float="slow2" className="top-[46%] left-0 rotate-[6deg] scale-90 z-20" />
            <StyleTag text="Breaking" tone="dark" mounted={mounted} delay={600} float="slow" className="bottom-0 left-[8%] rotate-[5deg] scale-90 z-20" />

            <div className="absolute -bottom-16 right-0 w-[64%] max-w-none pointer-events-none">
              <SmartImage src="/Bg-Registro-profesores-Mobile.png" alt="" width={2108} height={1664} className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-[1100px] mx-auto px-6">
          <span className="inline-flex items-center bg-primary text-white text-[11px] font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full mb-5">
            Sin importar tu estilo
          </span>
          <Reveal>
            <h2 className="text-[28px] lg:text-[42px] font-black text-neutral-900 tracking-tighter leading-[1.05] mb-12 lg:mb-16 max-w-lg">
              Tres pasos, una clase publicada
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-x-10 gap-y-12">
            {STEPS.map(({ n, Icon, title, text }, i) => (
              <Reveal key={n} delay={i * 120}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[15px] font-black text-primary">{n}</span>
                  <Icon className="w-5 h-5 text-neutral-900" />
                </div>
                <h3 className="text-[19px] font-bold text-neutral-900 mb-2">{title}</h3>
                <p className="text-[14.5px] text-neutral-600 leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-neutral-50 py-16 lg:py-24">
        <div className="max-w-[720px] mx-auto px-6">
          <Reveal>
            <h2 className="text-[28px] lg:text-[36px] font-black text-neutral-900 tracking-tighter mb-10 lg:mb-14">
              Lo que más preguntan los profesores
            </h2>
          </Reveal>

          <div className="flex flex-col">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={faq.q} delay={i * 80} className="border-b border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-[16px] font-bold text-neutral-900">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 shrink-0 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 text-[14.5px] text-neutral-600 leading-relaxed max-w-lg">{faq.a}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-pink-800 py-16 lg:py-20">
        <Reveal className="max-w-[720px] mx-auto px-6 text-center" delay={0}>
          <h2 className="text-[28px] lg:text-[42px] font-black tracking-tighter text-white mb-4 leading-[1.05]">
            Tu próxima clase puede estar publicada hoy
          </h2>
          <p className="text-[16px] text-white/75 mb-9 max-w-lg mx-auto leading-relaxed">
            Gratis, sin comisiones, y sin trámites complicados.
          </p>
          <Link
            href="/unete"
            onClick={() => trackAuthCtaClick({ action: 'registro', location: 'beneficios_cta_final' })}
            className="btn-hero"
          >
            Únete como profesor →
          </Link>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image src="/logo.png" alt="Kynea" width={90} height={30} />
            <p className="text-[13px] text-neutral-400">© 2026 Kynea. La primera plataforma integral de danza en Latinoamérica.</p>
            <div className="flex gap-6 text-[13px] text-neutral-400">
              {[
                { label: 'Términos', href: '/terminos' },
                { label: 'Privacidad', href: '/privacidad' },
                { label: 'Contacto', href: 'mailto:hola@kynea.pe' },
              ].map(l => (
                <Link key={l.label} href={l.href} className="hover:text-neutral-700 transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
