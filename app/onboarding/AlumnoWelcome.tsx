'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Sparkles, Compass, MessageCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFunFocusBackground } from '@/lib/hooks/useFunFocusBackground';

// Pure intro carousel — no data is collected here, just a quick tour of what
// Kynea offers before dropping the student into /clases. See the profesor/
// academia wizard in page.tsx for the (very different) data-collecting flow.
const SLIDES = [
  {
    icon: Sparkles,
    title: '¡Bienvenido a Kynea!',
    description: 'La plataforma #1 de danza en Latinoamérica. Encuentra tu próxima clase en minutos.',
  },
  {
    icon: Compass,
    title: 'Cientos de clases, todos los estilos',
    description: 'Salsa, Heels, Bachata, Hip Hop y +50 estilos más. Filtra por ciudad, nivel y horario.',
  },
  {
    icon: MessageCircle,
    title: 'Profesores verificados, contacto directo',
    description: 'Escríbele directo por WhatsApp o Instagram. Sin comisiones, sin intermediarios.',
  },
];

export default function AlumnoWelcome() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const isLast = slide === SLIDES.length - 1;
  const { baseColor, revealId, revealStyle, shift } = useFunFocusBackground();

  async function finish() {
    setLoading(true);
    const supabase = createClient();
    // Mark onboarding as done so proxy.ts allows full navigation — same flag
    // the profesor/academia wizard sets, just without any form data behind it.
    await supabase.auth.updateUser({ data: { onboarding_done: true } });
    router.push('/clases');
  }

  const { icon: Icon, title, description } = SLIDES[slide];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: baseColor }} />
        <div key={revealId} style={revealStyle} />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Solid white bar — the purple logo needs to stay legible regardless
            of which hue the background is currently cycled to. */}
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <Image src="/logo.png" alt="Kynea" width={90} height={29} />
          <button
            type="button"
            onClick={() => { finish(); shift(); }}
            disabled={loading}
            className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-50"
          >
            Omitir
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md animate-fade-in">
            <div className="bg-white rounded-[20px] border border-neutral-900 shadow-xl p-8 text-center">
              <div key={slide} className="animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-primary-bg flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-black text-neutral-900 mb-2">{title}</h2>
                <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
              </div>

              <div className="flex gap-1.5 justify-center mt-8 mb-6">
                {SLIDES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slide ? 'w-6 bg-primary' : 'w-1.5 bg-neutral-200'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => { if (isLast) { finish(); } else { setSlide(s => s + 1); } shift(); }}
                disabled={loading}
                className="btn-dark w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Cargando…' : isLast ? 'Explorar clases →' : 'Siguiente →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
