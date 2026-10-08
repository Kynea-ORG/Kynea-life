import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LegalNav from '@/components/LegalNav';

export const metadata: Metadata = {
  title: 'Reglas de Publicación – Kynea',
  description: 'Reglas y directrices de publicación de clases y perfiles en KYNEA · Versión 2.0 (Octubre de 2026).',
};

export default function TerminosPublicacionPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <div>
        <Header />
        <main className="max-w-[780px] mx-auto px-6 py-12 md:py-16">
          <LegalNav current="terminos-publicacion" />

          <h1 className="text-[32px] font-black text-neutral-900 mb-2 tracking-tight">Reglas de Publicación</h1>
          <p className="text-neutral-500 text-sm mb-8 font-medium">KYNEA · Versión 2.0 – Octubre de 2026</p>

          <div className="prose prose-neutral max-w-none text-[15px] text-neutral-700 space-y-7 leading-relaxed font-figtree">
            
            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">1. Información verdadera</h2>
              <p>
                Publica información real y actualizada sobre tus clases, horarios, precios, ubicación, experiencia y servicios.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">2. Contenido auténtico</h2>
              <p>
                Utiliza fotografías, videos, textos y demás material que tengas derecho a utilizar.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">3. Mantén tu perfil actualizado</h2>
              <p>
                Si cambias horarios, precios, ubicación o disponibilidad, actualiza tu información.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">4. Responde a tus alumnos</h2>
              <p>
                Procura responder oportunamente las consultas recibidas mediante los canales publicados.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">5. Nada de spam</h2>
              <p>
                No utilices KYNEA para enviar publicidad no solicitada, contenido engañoso o comunicaciones masivas.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">6. Respeta a la comunidad</h2>
              <p>
                No se permite utilizar KYNEA para violencia, hostigamiento o acoso sexual, conductas sexuales no consentidas, amenazas, intimidación, discriminación, abuso, coerción, represalias o actividades ilegales.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">7. No utilices KYNEA para perjudicar deliberadamente a otras personas</h2>
              <p>
                Los conflictos personales, disputas sentimentales o desacuerdos entre particulares no deben utilizarse para realizar campañas de hostigamiento, publicaciones deliberadamente falsas o acciones destinadas a perjudicar a otra persona dentro de la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-[19px] font-bold text-neutral-900 mb-2">8. Incumplimientos</h2>
              <p>
                El incumplimiento de estas reglas puede generar una advertencia, solicitud de modificación, restricción, suspensión temporal o retiro definitivo del perfil, dependiendo de la naturaleza y gravedad del caso.
              </p>
            </section>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 text-[14px] not-prose mt-8">
              <p className="font-semibold text-neutral-900 mb-1">Contacto para consultas o reportes</p>
              <p className="text-neutral-600">
                Puedes escribirnos directamente a:{' '}
                <a href="mailto:kynea.life@gmail.com" className="underline font-semibold text-neutral-900 hover:text-primary transition-colors">
                  kynea.life@gmail.com
                </a>
              </p>
            </div>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
