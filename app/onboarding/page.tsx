'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Upload, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/profiles/actions';

const STEPS = [
  'Datos públicos',
  'Contacto',
  'Especialidad',
  'Validación',
];

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({
    publicName: '',
    representante: '',
    city: 'Lima',
    district: '',
    bio: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    website: '',
    styles: [] as string[],
    experience: '',
    rulesAccepted: false,
  });
  const [waCode, setWaCode] = useState('+51');
  const [waNumber, setWaNumber] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [allDistricts, setAllDistricts] = useState<{ id: number; name: string; city: string }[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleStyle = (s: string) => {
    set('styles', form.styles.includes(s) ? form.styles.filter(x => x !== s) : [...form.styles, s]);
  };

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const [{ data: { user } }, stylesResult, districtsResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('dance_styles').select('name').order('ord'),
        supabase.from('districts').select('id, name, city').order('city').order('name'),
      ]);
      setAvailableStyles((stylesResult.data ?? []).map(r => r.name));
      setAllDistricts(districtsResult.data ?? []);
      if (!user) { setInitializing(false); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, bio, whatsapp, years_experience')
        .eq('id', user.id)
        .single();
      if (profile?.role) {
        setRole(profile.role);
        // Always check: if the profile is already filled, onboarding is done
        if (profile.bio || profile.whatsapp || profile.years_experience) {
          // Backfill the metadata flag for users who completed onboarding before
          // this enforcement was added (self-healing one-time redirect)
          await supabase.auth.updateUser({ data: { onboarding_done: true } });
          router.replace('/dashboard');
          return;
        }
        // Pre-fill name from existing profile (set by trigger from Google or email signup)
        if (profile.name) setForm(f => ({ ...f, publicName: profile.name }));
        // Pre-fill representante from user metadata if previously set (email signup)
        const rep = user.user_metadata?.representante as string | undefined;
        if (rep) setForm(f => ({ ...f, representante: rep }));
      } else {
        router.replace('/completar-registro');
        return;
      }
      setInitializing(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePhotoUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB.'); return; }
    setUploadingPhoto(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('class-images').upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path);
      setPhotoUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleNext() {
    if (step === 1) {
      if (!waNumber && !form.instagram) {
        setError('Ingresa al menos tu WhatsApp o Instagram para que los alumnos puedan contactarte.');
        return;
      }
    }
    setError('');
    setStep(s => s + 1);
  }

  const back = () => { setError(''); setStep(s => s - 1); };

  async function handleFinish() {
    if (!form.rulesAccepted) {
      setError('Debes aceptar las reglas de publicación para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      // Persist representante in user metadata for academia accounts (no DB column needed)
      if (role === 'academia' && form.representante) {
        await supabase.auth.updateUser({ data: { representante: form.representante } });
      }
      // Mark onboarding as done so proxy.ts allows full navigation
      await supabase.auth.updateUser({ data: { onboarding_done: true } });
      const yearsMap: Record<string, number> = { '1-2': 1, '3-5': 3, '5-10': 5, '10+': 10 };
      const expKey = form.experience ? form.experience.split(' ')[0] : '';
      await updateProfile({
        name:             form.publicName || undefined,
        bio:              form.bio || undefined,
        district_name:    form.district || undefined,
        district_city:    form.city || undefined,
        whatsapp:         waNumber ? `${waCode}${waNumber}` : undefined,
        instagram:        form.instagram || undefined,
        tiktok:           form.tiktok || undefined,
        youtube:          form.youtube || undefined,
        website:          form.website || undefined,
        style_names:      form.styles.length ? form.styles : undefined,
        years_experience: expKey ? yearsMap[expKey] : undefined,
        photo_url:        photoUrl || undefined,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar perfil');
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl animate-fade-in">
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
          {/* Step 0: Public data */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-black text-neutral-900 mb-2">Tus datos públicos</h2>
              <p className="text-sm text-neutral-500 mb-6">Esto es lo que verán los alumnos en tu perfil</p>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-4">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors relative"
                  >
                    {photoUrl ? (
                      <Image src={photoUrl} alt="Foto de perfil" fill sizes="80px" className="object-cover" />
                    ) : uploadingPhoto ? (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-neutral-400" />
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-neutral-500">{photoUrl ? 'Cambiar foto' : 'Subir foto o logo'}</p>
                </div>
                {[
                  { key: 'publicName', label: role === 'academia' ? 'Nombre de la academia' : 'Nombre público', placeholder: role === 'academia' ? 'Ej. Studio Ritmo Latino' : 'Tu nombre completo' },
                  ...(role === 'academia' ? [{ key: 'representante', label: 'Nombre del representante', placeholder: 'Nombre de quien gestiona la cuenta' }] : []),
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
                      onChange={e => { set('city', e.target.value); set('district', ''); }}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                    >
                      {[...new Set(allDistricts.map(d => d.city))].sort().map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Distrito</label>
                    <select
                      value={form.district}
                      onChange={e => set('district', e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                    >
                      <option value="">Seleccionar…</option>
                      {allDistricts.filter(d => d.city === form.city).map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Contact */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-black text-neutral-900 mb-2">Contacto y redes</h2>
              <p className="text-sm text-neutral-500 mb-6">Los alumnos te contactarán por estos canales</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={waCode}
                      onChange={e => setWaCode(e.target.value)}
                      className="border border-neutral-200 rounded-xl px-3 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 bg-white shrink-0"
                    >
                      <option value="+51">🇵🇪 +51</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+58">🇻🇪 +58</option>
                      <option value="+593">🇪🇨 +593</option>
                    </select>
                    <input
                      type="tel"
                      value={waNumber}
                      onChange={e => { setWaNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                      placeholder="999 999 999"
                      className="flex-1 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">Solo números, sin ceros iniciales. Ej: 999999999</p>
                </div>
                {[
                  { key: 'instagram', label: 'Instagram', placeholder: '@tuperfil', required: true },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@tuperfil' },
                  { key: 'youtube', label: 'YouTube', placeholder: '@tucanal' },
                  { key: 'website', label: 'Sitio web', placeholder: 'https://tuweb.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={(form as Record<string, unknown>)[f.key] as string}
                      onChange={e => { set(f.key as keyof typeof form, e.target.value); setError(''); }}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-4"><span className="text-red-500">*</span> Al menos uno es obligatorio</p>
            </div>
          )}

          {/* Step 2: Specialty */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-black text-neutral-900 mb-2">Tu especialidad</h2>
              <p className="text-sm text-neutral-500 mb-4">¿Qué estilos enseñas?</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {availableStyles.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStyle(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors active:scale-95 ${
                      form.styles.includes(s)
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
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
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-black text-neutral-900 mb-2">Confirmar y guardar</h2>
              <p className="text-sm text-neutral-500 mb-6">Revisa tu información antes de guardar</p>
              <div className="space-y-3">
                {form.publicName && (
                  <div className="flex justify-between p-3 bg-neutral-50 rounded-xl text-sm">
                    <span className="text-neutral-500">Nombre</span>
                    <span className="font-semibold text-neutral-900">{form.publicName}</span>
                  </div>
                )}
                {form.city && (
                  <div className="flex justify-between p-3 bg-neutral-50 rounded-xl text-sm">
                    <span className="text-neutral-500">Ubicación</span>
                    <span className="font-semibold text-neutral-900">{[form.district, form.city].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {form.styles.length > 0 && (
                  <div className="flex justify-between p-3 bg-neutral-50 rounded-xl text-sm">
                    <span className="text-neutral-500">Estilos</span>
                    <span className="font-semibold text-neutral-900">{form.styles.join(', ')}</span>
                  </div>
                )}
                {waNumber && (
                  <div className="flex justify-between p-3 bg-neutral-50 rounded-xl text-sm">
                    <span className="text-neutral-500">WhatsApp</span>
                    <span className="font-semibold text-neutral-900">{waCode} {waNumber}</span>
                  </div>
                )}
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-4 border border-neutral-200 rounded-xl mt-4">
                <input
                  type="checkbox"
                  checked={form.rulesAccepted}
                  onChange={e => set('rulesAccepted', e.target.checked)}
                  className="mt-1 accent-neutral-900"
                />
                <span className="text-sm text-neutral-600">
                  Acepto las <a href="/terminos-publicacion" target="_blank" rel="noopener noreferrer" className="text-neutral-900 underline hover:text-neutral-700">reglas de publicación</a> de Kynea y me comprometo a mantener mis clases actualizadas.
                </span>
              </label>
              <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                <p className="text-sm font-semibold text-neutral-900 mb-1">🎉 ¡Ya casi!</p>
                <p className="text-xs text-neutral-600">Al guardar tu perfil podrás publicar tu primera clase.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {error && (
            <p className="mt-6 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">{error}</p>
          )}
          <div className="flex gap-3 mt-4">
            {step > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-2 px-5 py-3 border border-neutral-200 rounded-btn text-sm font-semibold text-neutral-600 hover:border-neutral-900 transition-colors active:scale-[0.97]"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
            )}
            <button
              onClick={step === STEPS.length - 1 ? handleFinish : handleNext}
              disabled={loading}
              className="btn-dark flex-1 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Guardando…' : step === STEPS.length - 1 ? 'Guardar y entrar' : 'Continuar'}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
