'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Sparkles, Compass, MessageCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Image src="/logo.png" alt="Kynea" width={90} height={29} />
          <button
            type="button"
            onClick={finish}
            disabled={loading}
            className="text-sm font-semibold text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
          >
            Omitir
          </button>
        </div>

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
            onClick={() => (isLast ? finish() : setSlide(s => s + 1))}
            disabled={loading}
            className="btn-dark w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Cargando…' : isLast ? 'Explorar clases →' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
