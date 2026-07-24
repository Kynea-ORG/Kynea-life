import Header from '@/components/Header';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[780px] mx-auto px-6 py-16">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Política de privacidad y tratamiento de datos personales</h1>
        <p className="text-neutral-400 text-sm mb-10">Última actualización: julio 2026</p>
        <div className="prose prose-neutral max-w-none text-[15px] text-neutral-700 space-y-6">
          <p>
            En Kynea nos tomamos en serio la protección de tus datos personales. Este documento explica
            qué información recopilamos, para qué la usamos y qué derechos tienes sobre ella, conforme a
            la Ley N.º 29733 (Ley de Protección de Datos Personales) y su reglamento.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">Qué datos recopilamos</h2>
          <p>
            Según tu rol dentro de la plataforma, podemos recopilar: nombre, correo electrónico, foto de
            perfil, nacionalidad, biografía, WhatsApp, Instagram y otras redes sociales, estilos de baile
            de interés o especialidad, y la información de las clases que publicas o guardas.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">Para qué usamos tus datos</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Crear y mantener tu cuenta y tu perfil dentro de Kynea.</li>
            <li>Conectar a alumnos con profesores y academias de danza.</li>
            <li>Mostrar tu perfil público (nombre, foto, estilos, contacto) a otros usuarios, cuando corresponda a tu rol.</li>
            <li>Enviarte comunicaciones relacionadas con tu cuenta o con el servicio.</li>
            <li>Mejorar la plataforma y prevenir usos indebidos.</li>
          </ul>

          <h2 className="text-[18px] font-bold text-neutral-900">Con quién compartimos tu información</h2>
          <p>
            No vendemos ni compartimos tus datos personales con terceros con fines publicitarios. Los datos
            de contacto que un profesor o academia hace públicos (WhatsApp, Instagram) son visibles para
            cualquier usuario que visite su perfil, ya que esa es la función principal de esa información
            dentro de la plataforma. Los datos de un alumno solo son visibles para él mismo, salvo lo que
            decida compartir directamente al contactar a un profesor.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">Almacenamiento y seguridad</h2>
          <p>
            Tus datos se almacenan en infraestructura de terceros con estándares de seguridad de la
            industria (control de acceso, cifrado en tránsito). Solo el personal autorizado de Kynea puede
            acceder a datos que no sean públicos, y únicamente para operar o dar soporte a la plataforma.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">Tus derechos (ARCO)</h2>
          <p>
            Puedes ejercer en cualquier momento tus derechos de <strong>acceso</strong>, <strong>rectificación</strong>,{' '}
            <strong>cancelación</strong> y <strong>oposición</strong> sobre tus datos personales. También puedes
            actualizar la mayoría de tu información directamente desde tu perfil en el dashboard, o
            solicitarnos la eliminación completa de tu cuenta.
          </p>

          <h2 className="text-[18px] font-bold text-neutral-900">Contacto</h2>
          <p>
            Para ejercer tus derechos o cualquier consulta sobre el tratamiento de tus datos, escríbenos a{' '}
            <a href="mailto:hola@kynea.pe" className="underline text-neutral-900">hola@kynea.pe</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
