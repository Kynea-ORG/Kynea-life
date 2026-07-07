import Header from '@/components/Header';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[780px] mx-auto px-6 py-16">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Términos y condiciones</h1>
        <p className="text-neutral-400 text-sm mb-10">Última actualización: junio 2026</p>
        <div className="prose prose-neutral max-w-none text-[15px] text-neutral-700 space-y-6">
          <p>
            Al usar Kynea aceptas estos términos. La plataforma conecta a profesores de danza con alumnos.
            Kynea no es parte de las transacciones entre usuarios y no cobra comisiones.
          </p>
          <h2 className="text-[18px] font-bold text-neutral-900">Uso de la plataforma</h2>
          <p>
            Debes tener al menos 18 años para registrarte como profesor. La información publicada debe
            ser veraz y estar actualizada. Nos reservamos el derecho de eliminar perfiles o clases que
            incumplan estas normas.
          </p>
          <h2 className="text-[18px] font-bold text-neutral-900">Privacidad</h2>
          <p>
            Los datos de contacto (WhatsApp, Instagram) son visibles únicamente para usuarios registrados.
            No compartimos tu información con terceros sin tu consentimiento.
          </p>
          <h2 className="text-[18px] font-bold text-neutral-900">Contacto</h2>
          <p>
            Para cualquier consulta escríbenos a <a href="mailto:hola@kynea.pe" className="underline text-neutral-900">hola@kynea.pe</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
