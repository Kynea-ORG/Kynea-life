import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LegalNav from '@/components/LegalNav';

export const metadata: Metadata = {
  title: 'Términos y Condiciones de Uso – Kynea',
  description: 'Términos y condiciones de uso de la plataforma digital KYNEA · Versión 2.0 (Octubre de 2026).',
};

const SECCIONES = [
  { id: 'identificacion', title: '1. Identificación' },
  { id: 'naturaleza-del-servicio', title: '2. Naturaleza del servicio' },
  { id: 'registro-y-cuentas', title: '3. Registro y cuentas' },
  { id: 'publicacion', title: '4. Publicación de profesores y academias' },
  { id: 'perfil-verificado', title: '5. Perfil verificado' },
  { id: 'normas-comunidad', title: '6. Normas de comunidad, conducta y seguridad' },
  { id: 'medidas-moderacion', title: '7. Medidas de moderación y seguridad' },
  { id: 'informacion-publica', title: '8. Información pública y situaciones reportadas' },
  { id: 'contenido-usuarios', title: '9. Contenido de los usuarios' },
  { id: 'contacto-usuarios', title: '10. Contacto entre usuarios' },
  { id: 'limitaciones', title: '11. Limitaciones del servicio' },
  { id: 'suspension-cuentas', title: '12. Suspensión o cancelación de cuentas' },
  { id: 'datos-personales', title: '13. Protección de datos personales' },
  { id: 'propiedad-intelectual', title: '14. Propiedad intelectual' },
  { id: 'modificaciones', title: '15. Modificaciones' },
  { id: 'legislacion', title: '16. Legislación aplicable' },
];

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <div>
        <Header />
        <main className="max-w-[780px] mx-auto px-6 py-12 md:py-16">
          <LegalNav current="terminos" />

          <h1 className="text-[32px] font-black text-neutral-900 mb-2 tracking-tight">Términos y Condiciones de Uso</h1>
          <p className="text-neutral-500 text-sm mb-8 font-medium">KYNEA · Versión 2.0 – Octubre de 2026</p>

          {/* Índice rápido */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 mb-10 text-[13.5px]">
            <p className="font-bold text-neutral-900 mb-3 uppercase tracking-wider text-[11px] text-neutral-500">
              Índice de contenido
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-neutral-700">
              {SECCIONES.map(sec => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="hover:text-primary transition-colors hover:underline"
                >
                  {sec.title}
                </a>
              ))}
            </div>
          </div>

          <div className="prose prose-neutral max-w-none text-[15px] text-neutral-700 space-y-8 leading-relaxed font-figtree">

            <section id="identificacion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">1. Identificación</h2>
              <p className="mb-3">
                KYNEA (en adelante, &ldquo;KYNEA&rdquo;, la &ldquo;Plataforma&rdquo; o el &ldquo;Servicio&rdquo;) es una plataforma digital orientada a
                facilitar el descubrimiento de clases, profesores, academias y otras actividades relacionadas con la danza.
              </p>
              <p className="mb-3">
                Mientras KYNEA sea administrada directamente por una persona natural, la persona responsable de la Plataforma será:
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 text-[14px] not-prose mb-3 space-y-1">
                <p className="font-bold text-neutral-900">Kinverlyn Joshelyn Ampuero Camones</p>
                <p className="text-neutral-600">Lima, Perú</p>
                <p className="text-neutral-600">
                  Correo:{' '}
                  <a href="mailto:kynea.life@gmail.com" className="underline text-neutral-900 hover:text-primary transition-colors">
                    kynea.life@gmail.com
                  </a>
                </p>
              </div>
              <p>
                Estos Términos regulan el acceso y uso de la Plataforma disponible en{' '}
                <a href="https://kynea.dance/" className="underline text-neutral-900 hover:text-primary transition-colors">
                  https://kynea.dance/
                </a>. Al registrarse, crear una cuenta, publicar contenido o utilizar la Plataforma, el usuario declara haber leído y aceptado estos Términos.
              </p>
            </section>

            <section id="naturaleza-del-servicio" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">2. Naturaleza del servicio</h2>
              <p className="mb-3">
                KYNEA funciona como una plataforma digital que facilita la búsqueda y descubrimiento de clases y perfiles relacionados con la danza. A través de la Plataforma, los usuarios pueden:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>Crear perfiles de usuario;</li>
                <li>Crear perfiles de profesores;</li>
                <li>Crear perfiles de academias;</li>
                <li>Publicar clases;</li>
                <li>Buscar clases por diferentes criterios;</li>
                <li>Consultar información pública de profesores y academias;</li>
                <li>Contactar directamente con profesores o academias mediante los canales habilitados.</li>
              </ul>
              <p className="mb-3">
                Actualmente, KYNEA no constituye una academia de danza, agencia de representación, empleador de profesores, organizador de todas las clases publicadas ni intermediario de pagos.
              </p>
              <p>
                Los acuerdos relacionados con clases, precios, horarios, pagos, cambios, cancelaciones y demás condiciones se realizan directamente entre los usuarios y los profesores, academias u organizadores correspondientes, salvo que KYNEA implemente posteriormente funcionalidades específicas que indiquen lo contrario.
              </p>
            </section>

            <section id="registro-y-cuentas" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">3. Registro y cuentas</h2>
              <p className="mb-3">
                El usuario se compromete a proporcionar información verdadera, actualizada y suficiente para el funcionamiento del Servicio.
              </p>
              <p className="mb-3">
                El usuario es responsable de mantener la confidencialidad de sus credenciales y de las actividades realizadas desde su cuenta.
              </p>
              <p>
                La Plataforma está dirigida a personas mayores de 18 años. KYNEA actualmente no implementa un mecanismo específico de verificación de edad.
              </p>
            </section>

            <section id="publicacion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">4. Publicación de profesores y academias</h2>
              <p className="mb-3">
                Los profesores y academias son responsables de la información que publiquen.
              </p>
              <p className="mb-3">
                La información profesional, fotografías, biografías, estilos, experiencia, horarios, precios, ubicación y demás datos publicados deberán ser razonablemente veraces y no deberán inducir a error.
              </p>
              <p>
                La publicación de un perfil no significa que KYNEA certifique la calidad profesional, experiencia, formación, trayectoria, antecedentes o conducta de la persona.
              </p>
            </section>

            <section id="perfil-verificado" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">5. Perfil verificado</h2>
              <p className="mb-3">
                En KYNEA, la denominación &ldquo;Perfil verificado&rdquo; significa que el correo electrónico asociado al perfil del profesor ha sido verificado mediante un código enviado por la Plataforma.
              </p>
              <p className="mb-3">
                Esta verificación tiene como finalidad confirmar que existe acceso a la dirección de correo electrónico utilizada para crear el perfil.
              </p>
              <p className="mb-2 font-medium text-neutral-900">La verificación no constituye:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>una certificación de antecedentes penales o policiales;</li>
                <li>una certificación judicial;</li>
                <li>una certificación profesional;</li>
                <li>una garantía de conducta;</li>
                <li>una garantía de ausencia de denuncias o conflictos;</li>
                <li>una validación integral de la trayectoria del profesor.</li>
              </ul>
            </section>

            <section id="normas-comunidad" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">6. Normas de comunidad, conducta y seguridad</h2>
              <p className="mb-3">
                KYNEA busca contribuir a una comunidad de danza basada en el respeto, la dignidad y la seguridad.
              </p>
              <p className="mb-2 font-medium text-neutral-900">No está permitido utilizar KYNEA para:</p>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>ejercer violencia física o psicológica;</li>
                <li>realizar hostigamiento o acoso sexual;</li>
                <li>realizar conductas sexuales no consentidas;</li>
                <li>realizar amenazas o intimidación;</li>
                <li>ejercer discriminación;</li>
                <li>realizar conductas abusivas o coercitivas;</li>
                <li>aprovecharse indebidamente de una posición de poder o confianza;</li>
                <li>acosar, perseguir o intimidar a otros usuarios;</li>
                <li>publicar información deliberadamente falsa o engañosa;</li>
                <li>suplantar la identidad de otra persona;</li>
                <li>realizar actividades ilegales;</li>
                <li>tomar represalias contra una persona por comunicar de buena fe una situación de seguridad;</li>
                <li>utilizar la Plataforma para perjudicar deliberadamente a terceros.</li>
              </ul>
              <p>
                Estas reglas aplican al contenido publicado y, cuando llegue razonablemente a conocimiento de KYNEA, a conductas relacionadas directamente con actividades, clases o contactos derivados del uso de la Plataforma.
              </p>
            </section>

            <section id="medidas-moderacion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">7. Medidas de moderación y seguridad</h2>
              <p className="mb-3">
                KYNEA podrá revisar contenido público, información disponible y situaciones que lleguen razonablemente a su conocimiento cuando considere que pueden afectar el cumplimiento de sus normas o la seguridad de la comunidad.
              </p>
              <p className="mb-2 font-medium text-neutral-900">Dependiendo de la naturaleza y gravedad de la situación, KYNEA podrá:</p>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>solicitar modificaciones o aclaraciones;</li>
                <li>emitir advertencias;</li>
                <li>limitar determinadas funcionalidades;</li>
                <li>suspender temporalmente un perfil;</li>
                <li>retirar temporalmente una publicación;</li>
                <li>retirar definitivamente un perfil o contenido;</li>
                <li>adoptar otras medidas razonables para proteger la comunidad.</li>
              </ul>
              <p className="mb-3">
                En situaciones que impliquen un riesgo grave para la seguridad de la comunidad, KYNEA podrá adoptar medidas preventivas sin que ello implique una declaración de culpabilidad penal o administrativa.
              </p>
              <p>
                Las decisiones de KYNEA tienen como finalidad gestionar el acceso y participación en la Plataforma y proteger a su comunidad. No sustituyen las funciones de la Policía Nacional del Perú, el Ministerio Público, el Poder Judicial u otras autoridades competentes.
              </p>
            </section>

            <section id="informacion-publica" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">8. Información pública y situaciones reportadas públicamente</h2>
              <p className="mb-3">
                KYNEA podrá considerar información pública disponible relacionada con conductas que puedan ser incompatibles con sus normas de comunidad, especialmente cuando dicha información resulte relevante para la seguridad de los usuarios.
              </p>
              <p className="mb-3">
                KYNEA no garantiza la investigación o verificación exhaustiva de todas las denuncias, publicaciones o afirmaciones realizadas públicamente por terceros.
              </p>
              <p>
                La existencia de una denuncia pública no será presentada por KYNEA como una declaración de culpabilidad. Las medidas adoptadas por KYNEA se refieren a la participación de una persona en la Plataforma y no constituyen una sentencia ni una determinación oficial de responsabilidad.
              </p>
            </section>

            <section id="contenido-usuarios" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">9. Contenido de los usuarios</h2>
              <p>
                Cada usuario es responsable del contenido que publica. KYNEA podrá retirar contenido que infrinja estos Términos, las{' '}
                <Link href="/terminos-publicacion" className="underline text-neutral-900 hover:text-primary transition-colors font-medium">
                  Reglas de Publicación
                </Link>
                , las normas de comunidad o la legislación aplicable.
              </p>
            </section>

            <section id="contacto-usuarios" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">10. Contacto entre usuarios</h2>
              <p className="mb-3">
                KYNEA facilita herramientas de contacto entre estudiantes, profesores y academias. Una vez que los usuarios establecen contacto directamente, KYNEA no controla todas las comunicaciones ni acuerdos posteriores entre ellos.
              </p>
              <p>
                Los usuarios deberán mantener una conducta respetuosa y segura también durante las interacciones derivadas de su uso de la Plataforma.
              </p>
            </section>

            <section id="limitaciones" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">11. Limitaciones del servicio</h2>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>KYNEA no garantiza la disponibilidad permanente del servicio.</li>
                <li>KYNEA no garantiza la exactitud absoluta de toda información publicada por terceros.</li>
                <li>KYNEA no certifica la calidad, formación o experiencia de los profesores.</li>
                <li>KYNEA no garantiza la disponibilidad de una clase.</li>
                <li>KYNEA no garantiza la continuidad de una academia o profesor.</li>
                <li>KYNEA no garantiza la satisfacción del usuario.</li>
                <li>KYNEA no garantiza el cumplimiento de acuerdos celebrados directamente entre usuarios.</li>
              </ul>
              <p>Nada de lo anterior limita las obligaciones que legalmente correspondan a KYNEA.</p>
            </section>

            <section id="suspension-cuentas" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">12. Suspensión o cancelación de cuentas</h2>
              <p>
                KYNEA podrá suspender, limitar o cancelar cuentas cuando existan motivos razonables para considerar que el usuario incumplió estos Términos, las normas de comunidad, proporcionó información deliberadamente falsa, realizó actividades fraudulentas, puso en riesgo a otros usuarios o utilizó la Plataforma para actividades ilegales.
              </p>
            </section>

            <section id="datos-personales" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">13. Protección de datos personales</h2>
              <p>
                El tratamiento de datos personales se realiza conforme a la legislación peruana aplicable y a la{' '}
                <Link href="/privacidad" className="underline text-neutral-900 hover:text-primary transition-colors font-medium">
                  Política de Privacidad y Tratamiento de Datos Personales
                </Link>{' '}
                de KYNEA.
              </p>
            </section>

            <section id="propiedad-intelectual" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">14. Propiedad intelectual</h2>
              <p>
                Los usuarios deberán publicar únicamente contenido que tengan derecho a utilizar. KYNEA podrá retirar contenido cuando exista una razón razonable para considerar que infringe derechos de terceros o la legislación aplicable.
              </p>
            </section>

            <section id="modificaciones" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">15. Modificaciones</h2>
              <p>
                KYNEA podrá actualizar estos Términos por cambios legales, tecnológicos, operativos o por la incorporación de nuevas funcionalidades. La versión vigente estará disponible en la Plataforma.
              </p>
            </section>

            <section id="legislacion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">16. Legislación aplicable</h2>
              <p>
                Estos Términos se interpretan de conformidad con la legislación peruana, sin perjuicio de los derechos que correspondan a los usuarios conforme a las normas imperativas aplicables.
              </p>
            </section>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
