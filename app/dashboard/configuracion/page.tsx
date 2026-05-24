'use client';
import { Shield, Globe } from 'lucide-react';

const SECTIONS = [
  {
    icon: Globe, title: 'Visibilidad', desc: 'Controla cómo apareces en el buscador',
    settings: [
      { label: 'Aparecer en búsquedas públicas', default: true },
      { label: 'Mostrar mi número de WhatsApp', default: true },
      { label: 'Mostrar número de cupos disponibles', default: true },
      { label: 'Permitir compartir mis clases', default: true },
    ],
  },
  {
    icon: Shield, title: 'Privacidad y seguridad', desc: 'Gestiona tu contraseña y datos personales',
    settings: [
      { label: 'Autenticación en dos pasos', default: false },
    ],
  },
];

export default function ConfiguracionPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Configuración</h1>
        <p className="text-neutral-500 text-sm mt-1">Administra tus preferencias y seguridad</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-neutral-900" />
                </div>
                <div>
                  <h2 className="font-bold text-neutral-900">{section.title}</h2>
                  <p className="text-xs text-neutral-500">{section.desc}</p>
                </div>
              </div>
              <div className="space-y-4">
                {section.settings.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700">{s.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={s.default} className="sr-only peer" />
                      <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Danger zone */}
        <div className="bg-red-50 rounded-xl border border-red-100 p-6">
          <h2 className="font-bold text-red-700 mb-2">Zona de peligro</h2>
          <p className="text-sm text-red-600 mb-4">Estas acciones son irreversibles. Procede con cuidado.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="text-sm font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
              Eliminar todas mis clases
            </button>
            <button className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl transition-colors">
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
