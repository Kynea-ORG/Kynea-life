import Link from 'next/link';
import Header from '@/components/Header';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[780px] mx-auto px-6 py-16">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Términos y Condiciones de Uso</h1>
        <p className="text-neutral-400 text-sm mb-10">Plataforma KYNEA · Versión 1.0 – Julio de 2026</p>
        <div className="prose prose-neutral max-w-none text-[15px] text-neutral-700 space-y-6">

          <h2 className="text-[18px] font-bold text-neutral-900">1. Identificación del titular</h2>
          <p>
            Bienvenido(a) a KYNEA. Los presentes Términos y Condiciones regulan el acceso y uso de la
            plataforma digital KYNEA, disponible en{' '}
            <a href="https://kynea.life/" className="underline text-neutral-900">https://kynea.life/</a>{' '}
            (en adelante, la &ldquo;Plataforma&rdquo;).
          </p>
          <p>
            Mientras KYNEA se encuentra en etapa de desarrollo y validación de su modelo de negocio, la
            Plataforma es administrada por:
          </p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 text-[14px] not-prose">
            <p className="font-bold text-neutral-900 mb-1">Titular de la Plataforma</p>
            <p>Kinverlyn Joshelyn Ampuero Camones</p>
            <p>DNI N.° 74462778</p>
            <p>San Borja, Lima, Perú</p>
            <p>
              Correo electrónico:{' '}
              <a href="mailto:kynea.life@gmail.com" className="underline text-neutral-900">kynea.life@gmail.com</a>
            </p>
          </div>
          <p>
            Al acceder, registrarse o utilizar la Plataforma, el usuario declara haber leído, comprendido
            y aceptado íntegramente los presentes Términos y Condiciones. Si el usuario no está de acuerdo
            con estos términos, deberá abstenerse de utilizar la Plataforma.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">2. ¿Qué es KYNEA?</h2>
          <p>
            KYNEA es una plataforma tecnológica que busca centralizar la oferta de clases de danza y otras
            actividades relacionadas con el baile, permitiendo que profesores, academias y, progresivamente,
            otros actores del ecosistema publiquen información sobre sus servicios para que los usuarios
            puedan descubrirlos y contactarlos de forma sencilla. Esta finalidad está alineada con la misión
            de conectar y visibilizar el ecosistema de la danza mediante una plataforma digital especializada.
          </p>
          <p>
            Actualmente, KYNEA se encuentra en una etapa inicial (MVP o Producto Mínimo Viable), por lo que
            las funcionalidades disponibles podrán ampliarse, modificarse o eliminarse conforme evolucione
            la Plataforma.
          </p>
          <p>En su versión actual, KYNEA permite, entre otras funcionalidades:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Crear una cuenta de usuario.</li>
            <li>Crear un perfil de profesor o academia.</li>
            <li>Publicar clases.</li>
            <li>Buscar clases mediante filtros disponibles.</li>
            <li>Contactar directamente al profesor o academia a través de WhatsApp o Instagram.</li>
          </ul>
          <p>Actualmente, KYNEA:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>No vende clases.</li>
            <li>No procesa pagos.</li>
            <li>No recauda dinero.</li>
            <li>No cobra comisiones.</li>
            <li>No actúa como representante de profesores o academias.</li>
            <li>No organiza las clases publicadas.</li>
          </ul>
          <p>
            KYNEA funciona exclusivamente como una plataforma digital de publicación y conexión entre
            usuarios.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">3. Aceptación de los Términos</h2>
          <p>
            El acceso y uso de la Plataforma implica la aceptación plena de estos Términos y Condiciones.
            El usuario declara que tiene capacidad legal suficiente para aceptar este acuerdo conforme a la
            legislación peruana. Si el usuario actúa en representación de una academia, empresa u
            organización, declara contar con las facultades necesarias para hacerlo.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">4. Registro de usuarios</h2>
          <p>
            Para acceder a determinadas funcionalidades será necesario crear una cuenta. Durante esta etapa
            de desarrollo, la Plataforma podrá solicitar, según corresponda:
          </p>
          <p className="font-semibold text-neutral-900 mb-0">Alumnos</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre</li>
            <li>Correo electrónico</li>
          </ul>
          <p className="font-semibold text-neutral-900 mb-0">Profesores</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre</li>
            <li>Correo electrónico</li>
            <li>Usuario de Instagram (opcional)</li>
            <li>Usuario de TikTok (opcional)</li>
            <li>Canal de YouTube (opcional)</li>
            <li>Número de WhatsApp (opcional)</li>
            <li>Información profesional</li>
            <li>Biografía</li>
            <li>Horarios</li>
            <li>Ubicación de clases</li>
            <li>Fotografías</li>
            <li>Otros datos relacionados con su actividad profesional.</li>
          </ul>
          <p className="font-semibold text-neutral-900 mb-0">Academias</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre de la academia</li>
            <li>Nombre del representante</li>
            <li>Correo electrónico</li>
            <li>Información institucional</li>
            <li>Redes sociales</li>
            <li>Datos públicos de contacto</li>
            <li>Información de clases</li>
          </ul>
          <p>
            El usuario declara que toda la información proporcionada es verdadera, completa y actualizada.
            Cada usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">5. Uso adecuado de la Plataforma</h2>
          <p>
            El usuario se compromete a utilizar la Plataforma de manera responsable, respetando la
            legislación peruana, los derechos de terceros y las presentes condiciones. Está prohibido:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Publicar información falsa o engañosa.</li>
            <li>Suplantar la identidad de otras personas.</li>
            <li>Publicar contenido ilegal, ofensivo o discriminatorio.</li>
            <li>Compartir material que infrinja derechos de autor.</li>
            <li>Utilizar la Plataforma con fines fraudulentos.</li>
            <li>Intentar vulnerar la seguridad de la Plataforma.</li>
            <li>Realizar actividades automatizadas no autorizadas (bots, scraping malicioso o ataques informáticos).</li>
          </ul>
          <p>KYNEA podrá suspender o eliminar cuentas que incumplan estas disposiciones.</p>

          <h2 className="text-[18px] font-bold text-neutral-900">6. Contenido publicado por los usuarios</h2>
          <p>
            Los profesores y academias son los únicos responsables del contenido que publiquen en la
            Plataforma. Esto incluye, entre otros:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Fotografías</li>
            <li>Videos</li>
            <li>Biografías</li>
            <li>Horarios</li>
            <li>Direcciones</li>
            <li>Precios</li>
            <li>Modalidad de clases</li>
            <li>Redes sociales</li>
            <li>Información profesional</li>
          </ul>
          <p>
            El usuario garantiza que posee los derechos necesarios sobre dicho contenido o cuenta con las
            autorizaciones correspondientes para publicarlo. Al publicar contenido en KYNEA, el usuario
            otorga a la Plataforma una licencia gratuita, no exclusiva, revocable y limitada para alojar,
            reproducir, mostrar y comunicar dicho contenido dentro de la Plataforma con la finalidad de
            prestar el servicio.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">7. Contacto entre usuarios</h2>
          <p>
            KYNEA facilita el contacto entre alumnos, profesores y academias mediante enlaces a servicios de
            terceros, como WhatsApp e Instagram. Toda comunicación, negociación, inscripción, reserva o
            acuerdo posterior se realiza directamente entre las partes involucradas. KYNEA no participa ni
            interviene en dichas relaciones.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">8. Ausencia de intermediación económica</h2>
          <p>Durante esta etapa de desarrollo:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>KYNEA no cobra por publicar clases.</li>
            <li>KYNEA no vende clases.</li>
            <li>KYNEA no procesa pagos.</li>
            <li>KYNEA no recauda dinero.</li>
            <li>KYNEA no ofrece servicios financieros.</li>
            <li>KYNEA no administra reservas.</li>
          </ul>
          <p>
            Cualquier pago relacionado con una clase será realizado directamente entre el alumno y el
            profesor o academia utilizando los medios que ellos acuerden. En caso de que en el futuro la
            Plataforma incorpore funcionalidades de pago, reservas o comisiones, estos Términos y
            Condiciones serán actualizados y comunicados oportunamente a los usuarios.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">9. Limitación de responsabilidad</h2>
          <p>KYNEA actúa únicamente como una plataforma tecnológica de conexión. En consecuencia, no garantiza:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>La calidad de las clases publicadas.</li>
            <li>La experiencia o certificaciones de los profesores.</li>
            <li>La disponibilidad de horarios.</li>
            <li>La continuidad de las clases.</li>
            <li>La exactitud de toda la información publicada.</li>
            <li>El cumplimiento de acuerdos entre usuarios.</li>
            <li>La satisfacción respecto de los servicios contratados directamente entre las partes.</li>
          </ul>
          <p>
            Asimismo, KYNEA no será responsable por cancelaciones, cambios de horario, reembolsos,
            incumplimientos contractuales, daños personales, lesiones o cualquier controversia derivada de
            la relación entre alumnos, profesores o academias.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">10. Propiedad intelectual</h2>
          <p>
            Todos los derechos sobre la Plataforma, incluyendo su diseño, código fuente, estructura, bases
            de datos, logotipos, nombre comercial, marca &ldquo;KYNEA&rdquo; (cuando corresponda su
            registro), interfaces, funcionalidades y demás elementos desarrollados por la Plataforma son de
            titularidad del administrador o de sus respectivos titulares. Nada de lo dispuesto en estos
            Términos implica una cesión de derechos de propiedad intelectual a favor de los usuarios.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">11. Disponibilidad del servicio</h2>
          <p>El usuario reconoce que KYNEA es una startup tecnológica en constante evolución. La Plataforma podrá:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>incorporar nuevas funcionalidades;</li>
            <li>modificar procesos existentes;</li>
            <li>realizar mantenimientos programados;</li>
            <li>presentar interrupciones temporales del servicio;</li>
            <li>actualizar su infraestructura tecnológica.</li>
          </ul>
          <p>
            KYNEA realizará esfuerzos razonables para mantener la disponibilidad del servicio, pero no
            garantiza un funcionamiento ininterrumpido.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">12. Enlaces a servicios de terceros</h2>
          <p>La Plataforma puede contener enlaces hacia servicios operados por terceros, incluyendo, entre otros:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>WhatsApp</li>
            <li>Instagram</li>
            <li>YouTube</li>
          </ul>
          <p>
            KYNEA no controla dichos servicios ni asume responsabilidad por su contenido, funcionamiento,
            disponibilidad o políticas de privacidad.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">13. Protección de datos personales</h2>
          <p>
            El tratamiento de los datos personales de los usuarios se realiza conforme a la legislación
            peruana aplicable, incluyendo la Ley N.° 29733 – Ley de Protección de Datos Personales y su
            Reglamento. La información detallada sobre el tratamiento de datos personales se encuentra
            disponible en la{' '}
            <Link href="/privacidad" className="underline text-neutral-900">Política de Privacidad</Link>{' '}
            de KYNEA, que forma parte integrante de estos Términos.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">14. Cookies y tecnologías de seguimiento</h2>
          <p>
            La Plataforma utiliza cookies y herramientas tecnológicas para mejorar la experiencia del
            usuario, analizar el uso del sitio y optimizar su funcionamiento. Para ello, KYNEA podrá
            utilizar servicios como Google Analytics, Google Tag Manager y Meta Pixel, entre otros. La
            información completa sobre estas tecnologías se encuentra en la Política de Cookies.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">15. Modificaciones</h2>
          <p>
            KYNEA podrá actualizar estos Términos y Condiciones cuando resulte necesario por cambios
            legales, tecnológicos o por la incorporación de nuevas funcionalidades, incluyendo sistemas de
            reservas, pasarelas de pago, suscripciones, comisiones u otros servicios. Las modificaciones
            entrarán en vigor desde su publicación en la Plataforma, salvo que se indique expresamente una
            fecha distinta.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">16. Legislación aplicable y jurisdicción</h2>
          <p>
            Los presentes Términos y Condiciones se rigen por las leyes de la República del Perú. Cualquier
            controversia derivada de su interpretación, ejecución o cumplimiento será sometida a la
            jurisdicción de los jueces y tribunales competentes de Lima, Perú, salvo disposición legal
            imperativa en contrario.
          </p>
        </div>
      </div>
    </div>
  );
}
