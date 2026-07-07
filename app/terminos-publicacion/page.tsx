import Header from '@/components/Header';

export default function TerminosPublicacionPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[780px] mx-auto px-6 py-16">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Reglas de publicación</h1>
        <p className="text-neutral-400 text-sm mb-10">Última actualización: junio 2026</p>
        <div className="text-[15px] text-neutral-700 space-y-6">
          <p>Para publicar clases en Kynea debes cumplir con las siguientes reglas:</p>
          <ol className="list-decimal list-inside space-y-3">
            <li><strong>Información veraz:</strong> Horarios, precios y ubicación deben estar actualizados.</li>
            <li><strong>Fotos reales:</strong> Las imágenes deben mostrar la clase o academia real.</li>
            <li><strong>Respuesta oportuna:</strong> Responde los mensajes de alumnos en menos de 24 horas.</li>
            <li><strong>Actualización continua:</strong> Marca las clases como finalizadas cuando corresponda.</li>
            <li><strong>Sin spam:</strong> No publiques la misma clase múltiples veces con información diferente.</li>
            <li><strong>Contacto directo:</strong> Los datos de WhatsApp e Instagram deben ser de tu uso.</li>
          </ol>
          <p className="text-neutral-500 text-[13px] mt-8">
            El incumplimiento de estas reglas puede resultar en la suspensión de tu cuenta.
            Para consultas: <a href="mailto:hola@kynea.pe" className="underline text-neutral-900">hola@kynea.pe</a>
          </p>
        </div>
      </div>
    </div>
  );
}
