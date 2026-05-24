'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Check, Upload } from 'lucide-react';
import { DANCE_STYLES } from '@/lib/mockData';

const STEPS = [
  'Tipo de perfil',
  'Datos públicos',
  'Contacto',
  'Especialidad',
  'Validación',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    profileType: '',
    publicName: '',
    city: 'Lima',
    district: '',
    bio: '',
    whatsapp: '',
    email: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    website: '',
    styles: [] as string[],
    experience: '',
    audience: '',
    emailVerified: false,
    phoneVerified: false,
    rulesAccepted: false,
  });

  const set = (key: keyof typeof form, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleStyle = (s: string) => {
    set('styles', form.styles.includes(s) ? form.styles.filter(x => x !== s) : [...form.styles, s]);
  };

  const next = () => step < STEPS.length - 1 ? setStep(s => s + 1) : router.push('/dashboard');
  const back = () => step > 0 && setStep(s => s - 1);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.png" alt="Kynea" width={100} height={32} />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-neutral-700">
              Paso {step + 1} de {STEPS.length}: {STEPS[step]}
            </span>
            <span className="text-xs text-neutral-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Step 0: Profile type */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">¿Cómo te describes?</h2>
              <p className="text-sm text-neutral-500 mb-6">Elige el tipo de perfil que mejor te representa</p>
              <div className="space-y-3">
                {[
                  { value: 'profesor', label: 'Profesor independiente', desc: 'Enseño clases por mi cuenta', emoji: '🎓' },
                  { value: 'academia', label: 'Academia de danza', desc: 'Tengo o gestiono una academia', emoji: '🏫' },
                  { value: 'colectivo', label: 'Colectivo / compañía', desc: 'Somos un grupo de bailarines', emoji: '💃' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set('profileType', opt.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      form.profileType === opt.value
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-900'
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <div>
                      <p className="font-bold text-neutral-900 text-sm">{opt.label}</p>
                      <p className="text-xs text-neutral-500">{opt.desc}</p>
                    </div>
                    {form.profileType === opt.value && (
                      <div className="ml-auto w-6 h-6 bg-neutral-900 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Public data */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Tus datos públicos</h2>
              <p className="text-sm text-neutral-500 mb-6">Esto es lo que verán los alumnos en tu perfil</p>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center cursor-pointer hover:bg-neutral-200 transition-colors border-2 border-dashed border-neutral-300">
                    <Upload className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-500">Subir foto o logo</p>
                </div>
                {[
                  { key: 'publicName', label: 'Nombre público', placeholder: 'Academia Ritmo Latino o Tu nombre' },
                  { key: 'bio', label: 'Bio corta', placeholder: 'Cuéntanos sobre ti o tu academia…', type: 'textarea' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={field.placeholder}
                        value={(form as Record<string, unknown>)[field.key] as string}
                        onChange={e => set(field.key as keyof typeof form, e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={(form as Record<string, unknown>)[field.key] as string}
                        onChange={e => set(field.key as keyof typeof form, e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
                      />
                    )}
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ciudad</label>
                    <select
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                    >
                      {['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Distrito</label>
                    <input
                      type="text"
                      placeholder="Ej: Miraflores"
                      value={form.district}
                      onChange={e => set('district', e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Contacto y redes</h2>
              <p className="text-sm text-neutral-500 mb-6">Los alumnos te contactarán por estos canales</p>
              <div className="space-y-4">
                {[
                  { key: 'whatsapp', label: 'WhatsApp *', placeholder: '+51 999 999 999', type: 'tel' },
                  { key: 'email', label: 'Email *', placeholder: 'tu@correo.com', type: 'email' },
                  { key: 'instagram', label: 'Instagram', placeholder: '@tuperfil' },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@tuperfil' },
                  { key: 'youtube', label: 'YouTube', placeholder: '@tucanal' },
                  { key: 'website', label: 'Sitio web', placeholder: 'https://tuweb.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      placeholder={f.placeholder}
                      value={(form as Record<string, unknown>)[f.key] as string}
                      onChange={e => set(f.key as keyof typeof form, e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Specialty */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Tu especialidad</h2>
              <p className="text-sm text-neutral-500 mb-4">¿Qué estilos enseñas?</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {DANCE_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStyle(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.styles.includes(s)
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Años de experiencia</label>
                  <select
                    value={form.experience}
                    onChange={e => set('experience', e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                  >
                    <option value="">Seleccionar…</option>
                    {['1-2', '3-5', '5-10', '10+'].map(v => <option key={v}>{v} años</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Público objetivo</label>
                  <select
                    value={form.audience}
                    onChange={e => set('audience', e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                  >
                    <option value="">Seleccionar…</option>
                    {['Niños', 'Adolescentes', 'Adultos', 'Adulto mayor', 'Todas las edades'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Validation */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-black text-neutral-900 mb-2">Validación</h2>
              <p className="text-sm text-neutral-500 mb-6">Último paso: confirma tus datos</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Confirmar correo</p>
                    <p className="text-xs text-neutral-500">Te enviamos un código a tu email</p>
                  </div>
                  <button
                    onClick={() => set('emailVerified', !form.emailVerified)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                      form.emailVerified
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {form.emailVerified ? '✓ Verificado' : 'Verificar'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Confirmar celular</p>
                    <p className="text-xs text-neutral-500">Te enviamos un SMS de verificación</p>
                  </div>
                  <button
                    onClick={() => set('phoneVerified', !form.phoneVerified)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                      form.phoneVerified
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {form.phoneVerified ? '✓ Verificado' : 'Verificar'}
                  </button>
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-4 border border-neutral-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={form.rulesAccepted}
                    onChange={e => set('rulesAccepted', e.target.checked)}
                    className="mt-1 accent-neutral-900"
                  />
                  <span className="text-sm text-neutral-600">
                    Acepto las <span className="text-neutral-900 underline cursor-pointer">reglas de publicación</span> de Kynea y me comprometo a mantener mis clases actualizadas.
                  </span>
                </label>
              </div>
              <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
                <p className="text-sm font-semibold text-neutral-900 mb-1">🎉 ¡Ya casi!</p>
                <p className="text-xs text-neutral-600">Al completar el registro podrás publicar tu primera clase.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-2 px-5 py-3 border border-neutral-200 rounded-btn text-sm font-semibold text-neutral-600 hover:border-neutral-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-700 text-white font-bold py-3 rounded-btn transition-colors"
            >
              {step === STEPS.length - 1 ? 'Ir a mi dashboard' : 'Continuar'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
