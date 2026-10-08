import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LegalNav from '@/components/LegalNav';

export const metadata: Metadata = {
  title: 'Política de Privacidad y Tratamiento de Datos Personales – Kynea',
  description: 'Política de Privacidad y Tratamiento de Datos Personales de KYNEA · Versión 2.0 (Octubre de 2026) conforme a la Ley N.º 29733 y D.S. N.º 016-2024-JUS.',
};

const SECCIONES = [
  { id: 'introduccion', title: '1. Introducción' },
  { id: 'responsable', title: '2. Responsable del tratamiento' },
  { id: 'consentimiento', title: '3. Consentimiento y bases aplicables' },
  { id: 'datos-recopilados', title: '4. Datos personales que recopilamos' },
  { id: 'perfil-publico', title: '5. Información pública del perfil' },
  { id: 'finalidades', title: '6. Finalidades del tratamiento' },
  { id: 'seguridad-moderacion', title: '7. Seguridad y moderación' },
  { id: 'compartimos-datos', title: '8. Compartimos los datos' },
  { id: 'transferencias', title: '9. Transferencias internacionales' },
  { id: 'conservacion', title: '10. Conservación' },
  { id: 'seguridad', title: '11. Seguridad' },
  { id: 'derechos-titular', title: '12. Derechos del titular' },
  { id: 'cookies', title: '13. Cookies y tecnologías de seguimiento' },
  { id: 'mayores-edad', title: '14. Mayores de edad' },
  { id: 'modificaciones', title: '15. Modificaciones' },
  { id: 'contacto', title: '16. Contacto' },
];

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <div>
        <Header />
        <main className="max-w-[780px] mx-auto px-6 py-12 md:py-16">
          <LegalNav current="privacidad" />

          <h1 className="text-[32px] font-black text-neutral-900 mb-2 tracking-tight">
            Política de Privacidad y Tratamiento de Datos Personales
          </h1>
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

            <section id="introduccion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">1. Introducción</h2>
              <p className="mb-3">
                En KYNEA respetamos la privacidad de nuestros usuarios y estamos comprometidos con el tratamiento responsable de sus datos personales.
              </p>
              <p className="mb-3">
                Esta Política explica cómo recopilamos, utilizamos, almacenamos, protegemos y tratamos los datos personales de quienes acceden o utilizan la Plataforma disponible en{' '}
                <a href="https://kynea.dance/" className="underline text-neutral-900 hover:text-primary transition-colors">
                  https://kynea.dance/
                </a>.
              </p>
              <p>
                El tratamiento se realiza conforme a la legislación peruana aplicable, incluyendo la Ley N.º 29733 – Ley de Protección de Datos Personales, su Reglamento aprobado mediante Decreto Supremo N.º 016-2024-JUS y las normas complementarias emitidas por la Autoridad Nacional de Protección de Datos Personales.
              </p>
            </section>

            <section id="responsable" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">2. Responsable del tratamiento</h2>
              <p className="mb-3">
                Mientras KYNEA sea administrada directamente por una persona natural, la persona responsable del tratamiento será:
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
                Cuando KYNEA pase a ser administrada por una persona jurídica, esta Política será actualizada para reflejar la nueva estructura.
              </p>
            </section>

            <section id="consentimiento" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">3. Consentimiento y bases aplicables</h2>
              <p className="mb-3">
                KYNEA tratará los datos personales de acuerdo con las finalidades informadas en esta Política y, cuando corresponda, con el consentimiento del titular.
              </p>
              <p className="mb-3">
                Dependiendo del tratamiento específico, podrán resultar aplicables otras bases habilitadas por la legislación peruana, incluyendo la ejecución de la relación con el usuario y el cumplimiento de obligaciones legales.
              </p>
              <p>
                Cuando el consentimiento sea necesario, será solicitado mediante los mecanismos habilitados por la Plataforma.
              </p>
            </section>

            <section id="datos-recopilados" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">4. Datos personales que recopilamos</h2>
              
              <h3 className="text-[16px] font-bold text-neutral-900 mt-4 mb-2">4.1 Datos de registro</h3>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>nombre completo;</li>
                <li>correo electrónico;</li>
                <li>contraseña.</li>
              </ul>
              <p className="mb-4 text-[14px] text-neutral-600 italic">
                Las contraseñas deberán mantenerse mediante mecanismos de seguridad adecuados y no serán utilizadas por KYNEA en formato legible.
              </p>

              <h3 className="text-[16px] font-bold text-neutral-900 mt-4 mb-2">4.2 Información del perfil</h3>
              <ul className="list-disc list-inside space-y-1.5 mb-4 pl-1">
                <li>nombre artístico;</li>
                <li>nombre de academia;</li>
                <li>nombre del representante;</li>
                <li>fotografía;</li>
                <li>biografía profesional;</li>
                <li>experiencia;</li>
                <li>especialidades;</li>
                <li>estilos de danza;</li>
                <li>horarios;</li>
                <li>dirección o distrito donde se desarrollan las clases;</li>
                <li>modalidad;</li>
                <li>precio;</li>
                <li>WhatsApp;</li>
                <li>Instagram;</li>
                <li>TikTok;</li>
                <li>YouTube.</li>
              </ul>

              <h3 className="text-[16px] font-bold text-neutral-900 mt-4 mb-2">4.3 Información técnica</h3>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>dirección IP;</li>
                <li>tipo de navegador;</li>
                <li>sistema operativo;</li>
                <li>dispositivo;</li>
                <li>idioma;</li>
                <li>fecha y hora de acceso;</li>
                <li>páginas visitadas;</li>
                <li>tiempo de navegación;</li>
                <li>acciones realizadas dentro de la Plataforma.</li>
              </ul>
            </section>

            <section id="perfil-publico" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">5. Información pública del perfil</h2>
              <p className="mb-3">
                La información que el usuario decida incorporar como parte de su perfil público podrá ser visible para otros usuarios y visitantes de KYNEA:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>nombre artístico;</li>
                <li>fotografía;</li>
                <li>biografía;</li>
                <li>experiencia;</li>
                <li>estilos de danza;</li>
                <li>horarios;</li>
                <li>distrito o ubicación;</li>
                <li>modalidad;</li>
                <li>precio;</li>
                <li>redes sociales;</li>
                <li>número de contacto y enlaces públicos.</li>
              </ul>
              <p>
                La información destinada a ser pública podrá ser indexada por motores de búsqueda. KYNEA no publicará contraseñas ni información que no haya sido destinada por el usuario para publicación.
              </p>
            </section>

            <section id="finalidades" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">6. Finalidades del tratamiento</h2>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>crear y administrar cuentas;</li>
                <li>permitir la publicación de clases;</li>
                <li>mostrar perfiles públicos;</li>
                <li>facilitar el contacto entre alumnos, profesores y academias;</li>
                <li>administrar y mantener la Plataforma;</li>
                <li>brindar soporte técnico;</li>
                <li>atender consultas;</li>
                <li>mejorar la experiencia del usuario;</li>
                <li>analizar el uso y navegación;</li>
                <li>optimizar el rendimiento;</li>
                <li>desarrollar nuevas funcionalidades;</li>
                <li>detectar actividades fraudulentas o usos indebidos;</li>
                <li>mantener la seguridad de la Plataforma y la comunidad;</li>
                <li>gestionar incumplimientos de las normas de KYNEA;</li>
                <li>adoptar medidas de moderación cuando corresponda;</li>
                <li>cumplir obligaciones legales.</li>
              </ul>
            </section>

            <section id="seguridad-moderacion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">7. Información relacionada con seguridad y moderación</h2>
              <p className="mb-3">
                Actualmente KYNEA no cuenta con un sistema formal de reportes ni un botón de denuncia dentro de la Plataforma. Por ello, esta versión no establece un proceso de recepción y seguimiento de evidencias mediante un formulario.
              </p>
              <p className="mb-3">
                Sin perjuicio de ello, KYNEA puede recibir información sobre situaciones de seguridad o conducta a través de sus canales generales de comunicación o mediante información pública disponible.
              </p>
              <p className="mb-3">
                Cuando resulte necesario, dicha información podrá ser utilizada para evaluar el cumplimiento de las normas de KYNEA, proteger la comunidad y adoptar medidas sobre perfiles o contenidos.
              </p>
              <p>
                KYNEA procurará limitar el tratamiento a la información pertinente y necesaria para la finalidad correspondiente.
              </p>
            </section>

            <section id="compartimos-datos" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">8. Compartimos los datos</h2>
              <p className="mb-3">
                KYNEA no vende, alquila ni comercializa los datos personales de sus usuarios.
              </p>
              <p className="mb-3">
                KYNEA utiliza proveedores tecnológicos necesarios para el funcionamiento de la Plataforma, que pueden tratar información conforme a los servicios prestados y a las condiciones aplicables:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>Supabase — base de datos, autenticación y almacenamiento;</li>
                <li>Vercel — infraestructura y alojamiento;</li>
                <li>Google Analytics — analítica web;</li>
                <li>Google Tag Manager — gestión de etiquetas;</li>
                <li>Google Ads Conversion Tracking — medición de conversiones y campañas;</li>
                <li>Meta Pixel — medición de campañas y publicidad.</li>
              </ul>
            </section>

            <section id="transferencias" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">9. Transferencias internacionales</h2>
              <p>
                Debido al uso de proveedores tecnológicos internacionales, algunos datos pueden almacenarse o procesarse fuera del Perú. KYNEA adoptará las medidas que correspondan conforme a la legislación peruana aplicable.
              </p>
            </section>

            <section id="conservacion" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">10. Conservación</h2>
              <p className="mb-3">
                Los datos serán conservados durante el tiempo necesario para cumplir las finalidades informadas, mantener la relación con el usuario, cumplir obligaciones legales y proteger los derechos de KYNEA y sus usuarios.
              </p>
              <p>
                Cuando los datos dejen de ser necesarios, podrán ser eliminados, anonimizados o conservados cuando exista una obligación o habilitación legal para ello.
              </p>
            </section>

            <section id="seguridad" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">11. Seguridad</h2>
              <p className="mb-3">
                KYNEA implementa medidas técnicas y organizativas razonables para proteger la información frente a accesos no autorizados, pérdida, alteración, destrucción o uso indebido:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>conexiones seguras (HTTPS);</li>
                <li>controles de acceso;</li>
                <li>mecanismos de autenticación;</li>
                <li>almacenamiento seguro de credenciales;</li>
                <li>proveedores tecnológicos especializados;</li>
                <li>buenas prácticas de seguridad informática.</li>
              </ul>
              <p className="italic text-neutral-600">
                Ningún sistema puede garantizar una seguridad absoluta.
              </p>
            </section>

            <section id="derechos-titular" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">12. Derechos del titular</h2>
              <p className="mb-3">
                El usuario podrá ejercer los derechos reconocidos por la legislación peruana respecto de sus datos personales, incluyendo los que correspondan de información, acceso, rectificación, actualización, cancelación, oposición y revocación del consentimiento cuando resulte aplicable.
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 not-prose my-3">
                <p className="font-semibold text-neutral-900 mb-1 text-[14px]">Ejercicio de derechos ARCO</p>
                <p className="text-neutral-600 text-[13.5px]">
                  Las solicitudes podrán enviarse a:{' '}
                  <a href="mailto:kynea.life@gmail.com" className="underline font-semibold text-neutral-900 hover:text-primary transition-colors">
                    kynea.life@gmail.com
                  </a>
                  . KYNEA las atenderá conforme a los procedimientos y plazos establecidos por la legislación aplicable.
                </p>
              </div>
            </section>

            <section id="cookies" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">13. Cookies y tecnologías de seguimiento</h2>
              <p className="mb-3">
                KYNEA utiliza cookies y tecnologías similares para mejorar la experiencia, analizar el uso de la Plataforma, medir campañas y optimizar el rendimiento:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
                <li>Google Analytics;</li>
                <li>Google Tag Manager;</li>
                <li>Google Ads Conversion Tracking;</li>
                <li>Meta Pixel.</li>
              </ul>
              <p>
                Para más información, el usuario podrá consultar la Política de Cookies de KYNEA.
              </p>
            </section>

            <section id="mayores-edad" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">14. Mayores de edad</h2>
              <p className="mb-3">
                La Plataforma está dirigida a personas mayores de 18 años. Al crear una cuenta, el usuario declara que cumple este requisito.
              </p>
              <p>
                KYNEA actualmente no implementa un mecanismo específico de verificación de edad. Si KYNEA incorpora funcionalidades dirigidas a menores de edad, esta Política y las medidas de protección correspondientes serán revisadas antes de su implementación.
              </p>
            </section>

            <section id="modificaciones" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">15. Modificaciones</h2>
              <p>
                KYNEA podrá actualizar esta Política por cambios legales, tecnológicos, operativos o por nuevas funcionalidades. La versión vigente estará disponible en la Plataforma.
              </p>
            </section>

            <section id="contacto" className="scroll-mt-24">
              <h2 className="text-[19px] font-bold text-neutral-900 mb-3">16. Contacto</h2>
              <p className="mb-3">
                Para consultas relacionadas con esta Política o con el tratamiento de datos personales:
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 text-[14px] not-prose space-y-1">
                <p className="font-bold text-neutral-900">KYNEA</p>
                <p className="text-neutral-600">
                  Correo:{' '}
                  <a href="mailto:kynea.life@gmail.com" className="underline text-neutral-900 hover:text-primary transition-colors">
                    kynea.life@gmail.com
                  </a>
                </p>
                <p className="text-neutral-600">Lima, Perú.</p>
              </div>
            </section>

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
