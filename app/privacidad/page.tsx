import Header from '@/components/Header';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[780px] mx-auto px-6 py-16">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Política de Privacidad y Tratamiento de Datos Personales</h1>
        <p className="text-neutral-400 text-sm mb-10">KYNEA · Versión 1.0 – Julio de 2026</p>
        <div className="prose prose-neutral max-w-none text-[15px] text-neutral-700 space-y-6">

          <h2 className="text-[18px] font-bold text-neutral-900">1. Introducción</h2>
          <p>
            En KYNEA (en adelante, la &ldquo;Plataforma&rdquo;) respetamos la privacidad de nuestros
            usuarios y estamos comprometidos con la protección de sus datos personales. La presente
            Política de Privacidad y Tratamiento de Datos Personales explica cómo recopilamos, utilizamos,
            almacenamos, protegemos y tratamos la información personal de quienes acceden o utilizan la
            Plataforma disponible en{' '}
            <a href="https://kynea.life/" className="underline text-neutral-900">https://kynea.life/</a>.
          </p>
          <p>
            El tratamiento de datos personales se realiza de conformidad con la legislación vigente de la
            República del Perú, especialmente:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ley N.º 29733 – Ley de Protección de Datos Personales.</li>
            <li>Reglamento aprobado mediante Decreto Supremo N.º 003-2013-JUS.</li>
            <li>Normativa complementaria emitida por la Autoridad Nacional de Protección de Datos Personales.</li>
          </ul>
          <p>
            Al registrarse o utilizar la Plataforma, el usuario declara haber leído y aceptado la presente
            Política de Privacidad.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">2. Responsable del tratamiento</h2>
          <p>
            Mientras KYNEA se encuentra en etapa de desarrollo y validación como startup tecnológica, el
            responsable del tratamiento de los datos personales es:
          </p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 text-[14px] not-prose">
            <p>Kinverlyn Joshelyn Ampuero Camones</p>
            <p>DNI N.° 74462778</p>
            <p>San Borja, Lima, Perú</p>
            <p>
              Correo electrónico:{' '}
              <a href="mailto:kynea.life@gmail.com" className="underline text-neutral-900">kynea.life@gmail.com</a>
            </p>
          </div>
          <p>
            En caso de que la Plataforma sea administrada posteriormente por una persona jurídica, esta
            Política será actualizada para reflejar el nuevo responsable del tratamiento.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">3. Consentimiento</h2>
          <p>
            Al crear una cuenta en KYNEA o utilizar sus servicios, el usuario otorga su consentimiento para
            el tratamiento de sus datos personales conforme a las finalidades descritas en esta Política.
            Durante el proceso de registro, el usuario deberá aceptar expresamente esta Política de
            Privacidad mediante el mecanismo habilitado por la Plataforma.
          </p>
          <p>
            En cualquier momento, el usuario podrá ejercer los derechos reconocidos por la legislación
            peruana respecto de sus datos personales.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">4. ¿Qué datos personales recopilamos?</h2>
          <p>
            Dependiendo del tipo de usuario y del uso de la Plataforma, podremos recopilar los siguientes
            datos personales.
          </p>

          <p className="font-semibold text-neutral-900 mb-0">4.1 Datos de registro</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre completo.</li>
            <li>Correo electrónico.</li>
            <li>Contraseña (almacenada mediante mecanismos de cifrado y seguridad).</li>
          </ul>

          <p className="font-semibold text-neutral-900 mb-0">4.2 Información del perfil</p>
          <p>En caso de profesores y academias:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre artístico (si corresponde).</li>
            <li>Nombre de la academia.</li>
            <li>Nombre del representante.</li>
            <li>Fotografía.</li>
            <li>Biografía profesional.</li>
            <li>Experiencia.</li>
            <li>Especialidades.</li>
            <li>Estilos de danza.</li>
            <li>Horarios.</li>
            <li>Dirección o distrito donde se desarrollan las clases.</li>
            <li>Modalidad.</li>
            <li>Precio de las clases.</li>
            <li>Número de WhatsApp.</li>
            <li>Usuario de Instagram.</li>
            <li>Usuario de TikTok.</li>
            <li>Canal de YouTube.</li>
          </ul>
          <p>Toda esta información es incorporada voluntariamente por el usuario.</p>

          <p className="font-semibold text-neutral-900 mb-0">4.3 Información técnica</p>
          <p>Cuando el usuario navega por la Plataforma podremos recopilar automáticamente información como:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Dirección IP.</li>
            <li>Tipo de navegador.</li>
            <li>Sistema operativo.</li>
            <li>Dispositivo utilizado.</li>
            <li>Idioma.</li>
            <li>Fecha y hora de acceso.</li>
            <li>Páginas visitadas.</li>
            <li>Tiempo de navegación.</li>
            <li>Acciones realizadas dentro de la Plataforma.</li>
          </ul>

          <h2 className="text-[18px] font-bold text-neutral-900">5. Información pública del perfil</h2>
          <p>
            Uno de los principales objetivos de KYNEA es brindar mayor visibilidad a profesores y academias
            de danza mediante la publicación de perfiles profesionales y clases dentro de la Plataforma.
          </p>
          <p>
            Por ello, el usuario reconoce y acepta que la información que decida incorporar como parte de
            su perfil público podrá ser visible para otros usuarios y visitantes de la Plataforma. Esta
            información puede incluir, entre otros:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre artístico.</li>
            <li>Fotografía.</li>
            <li>Biografía.</li>
            <li>Estilos de danza.</li>
            <li>Experiencia.</li>
            <li>Horarios.</li>
            <li>Distrito o ubicación de las clases.</li>
            <li>Modalidad.</li>
            <li>Precio.</li>
            <li>Redes sociales.</li>
            <li>Número de contacto.</li>
            <li>Enlaces públicos.</li>
          </ul>
          <p>
            Asimismo, el usuario reconoce que esta información pública podrá ser indexada por motores de
            búsqueda de Internet y utilizada para facilitar el descubrimiento de perfiles profesionales y
            clases disponibles.
          </p>
          <p>
            En ningún caso se harán públicos datos privados como la contraseña, el correo electrónico
            utilizado para el registro u otra información que no haya sido destinada por el usuario para su
            publicación.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">6. Finalidades del tratamiento</h2>
          <p>Los datos personales podrán ser utilizados para las siguientes finalidades:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Crear y administrar cuentas de usuario.</li>
            <li>Permitir la publicación de clases.</li>
            <li>Mostrar perfiles públicos.</li>
            <li>Facilitar el contacto entre alumnos, profesores y academias.</li>
            <li>Administrar el funcionamiento de la Plataforma.</li>
            <li>Brindar soporte técnico.</li>
            <li>Atender consultas.</li>
            <li>Mejorar la experiencia del usuario.</li>
            <li>Analizar el comportamiento de navegación.</li>
            <li>Optimizar el rendimiento de la Plataforma.</li>
            <li>Desarrollar nuevas funcionalidades.</li>
            <li>Detectar actividades fraudulentas.</li>
            <li>Cumplir obligaciones legales.</li>
          </ul>

          <h2 className="text-[18px] font-bold text-neutral-900">7. Base legal del tratamiento</h2>
          <p>El tratamiento de los datos personales se sustenta en:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>el consentimiento otorgado por el usuario;</li>
            <li>la ejecución de la relación derivada del uso de la Plataforma;</li>
            <li>el cumplimiento de obligaciones legales;</li>
            <li>el interés legítimo de KYNEA para garantizar la seguridad, mejora continua y correcto funcionamiento de la Plataforma.</li>
          </ul>

          <h2 className="text-[18px] font-bold text-neutral-900">8. ¿Compartimos los datos?</h2>
          <p>
            KYNEA no vende, alquila ni comercializa los datos personales de sus usuarios. Sin embargo,
            utiliza proveedores tecnológicos que prestan servicios indispensables para el funcionamiento de
            la Plataforma. Actualmente utilizamos:
          </p>
          <div className="not-prose overflow-x-auto">
            <table className="w-full text-[14px] border border-neutral-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-neutral-900 border-b border-neutral-200">Proveedor</th>
                  <th className="px-4 py-2.5 font-semibold text-neutral-900 border-b border-neutral-200">Finalidad</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Supabase', 'Base de datos, autenticación y almacenamiento seguro'],
                  ['Vercel', 'Infraestructura y alojamiento'],
                  ['Google Analytics', 'Analítica web'],
                  ['Google Tag Manager', 'Gestión de etiquetas'],
                  ['Google Ads Conversion Tracking (Google Ads Pixel)', 'Medición de conversiones y optimización de campañas publicitarias'],
                  ['Meta Pixel', 'Medición de campañas publicitarias y remarketing'],
                ].map(([provider, purpose]) => (
                  <tr key={provider} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2.5 align-top">{provider}</td>
                    <td className="px-4 py-2.5 align-top text-neutral-600">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Estos proveedores únicamente tratarán la información necesaria para prestar sus respectivos
            servicios conforme a sus propias políticas de privacidad.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">9. Transferencias internacionales</h2>
          <p>
            Debido a la utilización de proveedores tecnológicos internacionales, algunos datos podrán
            almacenarse o procesarse fuera del territorio peruano. KYNEA adopta medidas razonables para
            procurar que dichas transferencias cuenten con niveles adecuados de protección conforme a la
            normativa aplicable.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">10. Conservación de los datos</h2>
          <p>
            Los datos personales serán conservados únicamente durante el tiempo necesario para cumplir las
            finalidades descritas en esta Política o mientras exista una relación activa con el usuario.
            Posteriormente podrán ser eliminados o anonimizados, salvo obligación legal que exija su
            conservación.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">11. Seguridad de la información</h2>
          <p>
            KYNEA implementa medidas técnicas y organizativas razonables para proteger la información
            personal frente a accesos no autorizados, pérdida, alteración, destrucción o uso indebido. Entre
            otras medidas, utilizamos:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>conexiones seguras (HTTPS);</li>
            <li>almacenamiento seguro de credenciales;</li>
            <li>controles de acceso;</li>
            <li>proveedores tecnológicos especializados;</li>
            <li>buenas prácticas de seguridad informática.</li>
          </ul>
          <p>No obstante, ningún sistema puede garantizar una seguridad absoluta.</p>

          <h2 className="text-[18px] font-bold text-neutral-900">12. Derechos del titular</h2>
          <p>El usuario podrá ejercer los derechos reconocidos por la legislación peruana, incluyendo:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Información.</li>
            <li>Acceso.</li>
            <li>Rectificación.</li>
            <li>Actualización.</li>
            <li>Cancelación.</li>
            <li>Oposición.</li>
            <li>Revocación del consentimiento cuando corresponda.</li>
          </ul>
          <p>
            Las solicitudes podrán enviarse a:{' '}
            <a href="mailto:kynea.life@gmail.com" className="underline text-neutral-900">kynea.life@gmail.com</a>
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">13. Cookies y tecnologías de seguimiento</h2>
          <p>
            KYNEA utiliza cookies propias y de terceros para mejorar la experiencia del usuario y analizar
            el uso de la Plataforma. Entre las tecnologías utilizadas actualmente se encuentran:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Google Analytics.</li>
            <li>Google Tag Manager.</li>
            <li>Google Ads Conversion Tracking (Google Ads Pixel).</li>
            <li>Meta Pixel.</li>
          </ul>
          <p>
            Estas herramientas nos permiten comprender cómo interactúan los usuarios con la Plataforma,
            medir la efectividad de campañas publicitarias, optimizar el rendimiento del sitio y mejorar
            continuamente nuestros servicios. Para más información, el usuario podrá consultar la Política
            de Cookies de KYNEA.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">14. Menores de edad</h2>
          <p>
            La Plataforma está dirigida principalmente a personas mayores de edad. Si un menor utiliza la
            Plataforma, deberá hacerlo bajo la supervisión y responsabilidad de sus padres o representantes
            legales, cuando resulte aplicable conforme a la legislación vigente.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">15. Modificaciones</h2>
          <p>
            KYNEA podrá actualizar esta Política cuando resulte necesario debido a cambios legales,
            tecnológicos o por la incorporación de nuevas funcionalidades. La versión vigente estará siempre
            disponible en{' '}
            <a href="https://kynea.life/" className="underline text-neutral-900">https://kynea.life/</a>.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">16. Contacto</h2>
          <p>
            Para consultas relacionadas con esta Política o con el tratamiento de datos personales, el
            usuario podrá comunicarse con:
          </p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 text-[14px] not-prose">
            <p className="font-bold text-neutral-900 mb-1">KYNEA</p>
            <p>
              Correo electrónico:{' '}
              <a href="mailto:kynea.life@gmail.com" className="underline text-neutral-900">kynea.life@gmail.com</a>
            </p>
            <p>San Borja, Lima, Perú.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
