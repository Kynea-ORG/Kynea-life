'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Upload, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/profiles/actions';
import { uploadProfileImage } from '@/lib/profiles/imageActions';
import ImagePositionPicker from '@/components/ImagePositionPicker';
import { validateStep } from '@/lib/onboarding/validation';
import { NATIONALITIES } from '@/lib/nationalities';
import { getImageDimensions, MIN_IMAGE_DIMENSION } from '@/lib/imageDimensions';
import { useFunFocusBackground } from '@/lib/hooks/useFunFocusBackground';
import { trackSignUp, trackOnboardingStepComplete, trackOnboardingComplete } from '@/lib/analytics';
import { safeRedirectPath, DEFAULT_ACADEMIA_COVER } from '@/lib/utils';
import SmartImage from '@/components/SmartImage';
import PlacesAddressField from '@/components/PlacesAddressField';
import AlumnoWelcome from './AlumnoWelcome';

const STEPS_PROFESOR = [
  'Datos públicos',
  'Contacto',
  'Especialidad',
  'Validación',
];
// Academia inserta un paso propio "Tu academia" antes de Validación — así
// los índices 0/1/2 (Datos públicos, Contacto, Especialidad) quedan
// idénticos entre roles y validateStep() no necesita saber de role.
const STEPS_ACADEMIA = [
  'Datos públicos',
  'Contacto',
  'Especialidad',
  'Tu academia',
  'Validación',
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirectPath(searchParams.get('redirect'));
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const STEPS = role === 'academia' ? STEPS_ACADEMIA : STEPS_PROFESOR;
  const [form, setForm] = useState({
    publicName: '',
    representante: '',
    ruc: '',
    teamSize: '',
    branchCount: '',
    address: '',
    placeId: '',
    lat: '',
    lng: '',
    district: '',
    city: 'Lima',
    nationality: '',
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
  const [photoPosition, setPhotoPosition] = useState('50% 50%');
  const [photoZoom, setPhotoZoom] = useState(1);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Portada — solo academia. Arranca vacía (nada se persiste) y el picker
  // muestra DEFAULT_ACADEMIA_COVER como preview no interactiva hasta que
  // suben su propia imagen, para que vean que pueden reemplazarla.
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPosition, setCoverPosition] = useState('50% 50%');
  const [coverZoom, setCoverZoom] = useState(1);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { baseColor, revealId, revealStyle, shift } = useFunFocusBackground();

  const set = (key: keyof typeof form, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const toggleStyle = (s: string) => {
    set('styles', form.styles.includes(s) ? form.styles.filter(x => x !== s) : [...form.styles, s]);
  };

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const [{ data: { user } }, stylesResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('dance_styles').select('name').order('ord'),
      ]);
      setAvailableStyles((stylesResult.data ?? []).map(r => r.name));
      if (!user) { setInitializing(false); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, bio, whatsapp, years_experience')
        .eq('id', user.id)
        .single();
      if (profile?.role) {
        setRole(profile.role);
        // `new=1` is only ever set by the four signup completion points
        // (registro, confirmar-email, completar-registro, auth/callback) —
        // proxy.ts's own redirect back here for an unfinished onboarding
        // never includes it, so this can't double-fire on a later revisit.
        // Strip it from the URL right after firing — otherwise a refresh
        // during the wizard/carousel (before onboarding_done is set) would
        // re-fire sign_up on the exact same registration.
        if (searchParams.get('new') === '1') {
          trackSignUp({ role: profile.role, method: (user.app_metadata?.provider as string) ?? 'email' });
          // Preserve redirectTarget when stripping `new` — otherwise a
          // refresh right after this replace would lose track of where
          // AlumnoWelcome should send the user once they finish.
          router.replace(redirectTarget ? `/onboarding?redirect=${encodeURIComponent(redirectTarget)}` : '/onboarding');
        }
        if (profile.role === 'alumno') {
          // Alumno's onboarding is a pure intro carousel (AlumnoWelcome) with
          // no fields to backfill or validate — the only thing worth checking
          // is whether they've already seen it, to avoid replaying it on a
          // direct visit to /onboarding after finishing.
          if (user.user_metadata?.onboarding_done === true) {
            router.replace(redirectTarget ?? '/clases');
            return;
          }
          setInitializing(false);
          return;
        }
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
    setError('');
    try {
      const { width, height } = await getImageDimensions(file);
      if (Math.min(width, height) < MIN_IMAGE_DIMENSION) {
        setError(`La imagen es muy pequeña (${width}×${height}px). Sube una de al menos ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px para que se vea bien.`);
        return;
      }
    } catch {
      setError('No se pudo leer la imagen. Intenta con otro archivo.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const { url } = await uploadProfileImage(formData, 'photo');
      setPhotoUrl(url);
      setPhotoPosition('50% 50%');
      setPhotoZoom(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleCoverUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB.'); return; }
    setError('');
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const { url } = await uploadProfileImage(formData, 'cover');
      setCoverUrl(url);
      setCoverPosition('50% 50%');
      setCoverZoom(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la portada');
    } finally {
      setUploadingCover(false);
    }
  }

  function handleNext() {
    const result = validateStep(step, form, { waNumber });
    if (!result.ok) {
      setError(result.errors[0].message);
      return;
    }
    setError('');
    trackOnboardingStepComplete({ role, stepNumber: step, stepName: STEPS[step] });
    setStep(s => s + 1);
    shift();
  }

  const back = () => { setError(''); setStep(s => s - 1); shift(); };

  async function handleFinish() {
    // Valida todos los pasos de contenido excepto el último (Validación,
    // que solo depende del checkbox rulesAccepted, chequeado abajo). Cubre
    // "Tu academia" para role === 'academia' sin que validateStep necesite
    // saber de role: ese paso no tiene campos obligatorios, así que pasa
    // trivialmente igual que el resto de índices sin case explícito.
    for (let s = 0; s < STEPS.length - 1; s++) {
      const result = validateStep(s, form, { waNumber });
      if (!result.ok) {
        setError(`Revisa el paso ${s + 1}: ${result.errors[0].message}`);
        setStep(s);
        return;
      }
    }
    if (!form.rulesAccepted) {
      setError('Debes aceptar las reglas de publicación para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    shift();
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
        nationality:      form.nationality || undefined,
        ruc:              role === 'academia' && form.ruc ? form.ruc : undefined,
        whatsapp:         waNumber ? `${waCode}${waNumber}` : undefined,
        instagram:        form.instagram || undefined,
        tiktok:           form.tiktok || undefined,
        youtube:          form.youtube || undefined,
        website:          form.website || undefined,
        style_names:      form.styles.length ? form.styles : undefined,
        years_experience: expKey ? yearsMap[expKey] : undefined,
        photo_url:        photoUrl || undefined,
        photo_position:   photoUrl ? photoPosition : undefined,
        photo_zoom:       photoUrl ? photoZoom : undefined,
        team_size:            role === 'academia' && form.teamSize ? form.teamSize : undefined,
        branch_count:         role === 'academia' && form.branchCount ? form.branchCount : undefined,
        cover_image_url:      role === 'academia' && coverUrl ? coverUrl : undefined,
        cover_image_position: role === 'academia' && coverUrl ? coverPosition : undefined,
        cover_image_zoom:     role === 'academia' && coverUrl ? coverZoom : undefined,
        primary_venue: role === 'academia' && form.address.trim() ? {
          address: form.address.trim(),
          district: form.district.trim() || undefined,
          city: form.city.trim() || undefined,
          placeId: form.placeId || undefined,
          lat: form.lat ? Number(form.lat) : undefined,
          lng: form.lng ? Number(form.lng) : undefined,
        } : undefined,
      });

      // Academia-only: solicitud de aprobación. Se crea siempre, aunque la
      // dirección quede vacía — sin esta fila el admin nunca vería que esta
      // cuenta necesita revisión (ver docs/TASKS.md sección 8 y
      // assertAcademiaApproved en publishGuard.ts). La sede principal ya
      // quedó creada/actualizada arriba, dentro del updateProfile de encima
      // (primary_venue) — no duplicar esa lógica acá.
      if (role === 'academia') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: requestError } = await supabase.from('academia_requests').insert({
            profile_id: user.id,
            kind: 'signup',
            ruc: form.ruc || null,
          });
          // 23505 = academia_requests_one_pending_per_profile: same retry case.
          if (requestError && requestError.code !== '23505') throw requestError;
        }
      }

      trackOnboardingComplete({ role, skipped: false });
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

  if (role === 'alumno') {
    return <AlumnoWelcome redirectTo={redirectTarget ?? '/clases'} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: baseColor }} />
        <div key={revealId} style={revealStyle} />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Solid white bar — the purple logo needs to stay legible regardless
            of which hue the background is currently cycled to. */}
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-center">
          <Image src="/logo.png" alt="Kynea" width={100} height={32} />
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl animate-fade-in">

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
                  i <= step ? 'bg-primary' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-neutral-900 shadow-xl p-8">
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
                  {photoUrl ? (
                    <div className="relative">
                      <ImagePositionPicker
                        src={photoUrl}
                        value={photoPosition}
                        onChange={setPhotoPosition}
                        zoom={photoZoom}
                        onZoomChange={setPhotoZoom}
                        frameClassName="w-20 h-20 rounded-full border-2 border-dashed border-neutral-300"
                        sizes="80px"
                        compact
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoUrl('');
                          setPhotoPosition('50% 50%');
                          setPhotoZoom(1);
                          if (photoInputRef.current) photoInputRef.current.value = '';
                        }}
                        className="absolute top-0 right-0 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors active:scale-90 z-10"
                        aria-label="Eliminar foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors relative"
                    >
                      {uploadingPhoto ? (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-neutral-400" />
                        </div>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="text-xs font-semibold text-primary hover:text-primary-dark"
                  >
                    {photoUrl ? 'Cambiar foto' : 'Subir foto o logo'}
                  </button>
                  <p className="text-[11px] text-neutral-400 text-center">PNG, JPG o WebP · Máx. 5MB · Recomendado 400×400px</p>
                </div>
                {[
                  { key: 'publicName', label: role === 'academia' ? 'Nombre de la academia' : 'Nombre público', placeholder: role === 'academia' ? 'Ej. Studio Ritmo Latino' : 'Tu nombre completo', required: true },
                  ...(role === 'academia' ? [{ key: 'representante', label: 'Nombre del representante', placeholder: 'Nombre de quien gestiona la cuenta' }] : []),
                  { key: 'bio', label: 'Bio corta', placeholder: 'Cuéntanos sobre ti o tu academia…', type: 'textarea' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={field.placeholder}
                        value={(form as Record<string, unknown>)[field.key] as string}
                        onChange={e => set(field.key as keyof typeof form, e.target.value)}
                        className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={(form as Record<string, unknown>)[field.key] as string}
                        onChange={e => set(field.key as keyof typeof form, e.target.value)}
                        className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                      />
                    )}
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Nacionalidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.nationality}
                    onChange={e => set('nationality', e.target.value)}
                    className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                  >
                    <option value="">Seleccionar…</option>
                    {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
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
                      className="border-2 border-neutral-200 rounded-btn px-3 py-3 text-sm text-neutral-800 outline-none focus:border-primary bg-white shrink-0"
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
                      className="flex-1 border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
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
              <p className="text-sm text-neutral-500 mb-4">
                ¿Qué estilos enseñas? <span className="text-red-500">*</span>
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {availableStyles.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStyle(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border border-neutral-900 transition-colors active:scale-95 ${
                      form.styles.includes(s)
                        ? 'bg-primary text-white'
                        : 'text-neutral-600 hover:bg-neutral-50'
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

          {/* Paso "Tu academia" — solo role === 'academia', ver STEPS_ACADEMIA */}
          {role === 'academia' && step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-black text-neutral-900 mb-2">Tu academia</h2>
              <p className="text-sm text-neutral-500 mb-6">Esto ayuda a los alumnos a ubicarte y a Kynea a revisar tu cuenta más rápido — todo es opcional</p>
              <div className="space-y-4">
                {[
                  { key: 'ruc', label: 'RUC (opcional)', placeholder: '20123456789' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={(form as Record<string, unknown>)[field.key] as string}
                      onChange={e => set(field.key as keyof typeof form, e.target.value)}
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Tamaño del equipo</label>
                    <select
                      value={form.teamSize}
                      onChange={e => set('teamSize', e.target.value)}
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                    >
                      <option value="">Seleccionar…</option>
                      <option value="1-2">1-2 profesores</option>
                      <option value="3-5">3-5 profesores</option>
                      <option value="6+">6+ profesores</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Cantidad de sedes</label>
                    <select
                      value={form.branchCount}
                      onChange={e => set('branchCount', e.target.value)}
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none bg-white"
                    >
                      <option value="">Seleccionar…</option>
                      <option value="1">1 sede</option>
                      <option value="2-3">2-3 sedes</option>
                      <option value="4+">4+ sedes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Dirección de tu sede principal</label>
                  <PlacesAddressField
                    value={form.address}
                    placeholder="Av. Benavides 1234"
                    onManualChange={v => {
                      set('address', v);
                      set('placeId', '');
                      set('lat', '');
                      set('lng', '');
                    }}
                    onPlaceSelect={selection => {
                      set('address', selection.address);
                      set('placeId', selection.placeId);
                      set('lat', String(selection.lat));
                      set('lng', String(selection.lng));
                      if (selection.city) set('city', selection.city);
                      if (selection.district) set('district', selection.district);
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Distrito</label>
                    <input
                      type="text"
                      placeholder="Ej. Miraflores"
                      value={form.district}
                      onChange={e => set('district', e.target.value)}
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ciudad</label>
                    <input
                      type="text"
                      placeholder="Lima"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-700">Portada de tu perfil</label>
                    {coverUrl && (
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="text-xs font-semibold text-primary hover:text-primary-dark"
                      >
                        {uploadingCover ? 'Subiendo…' : 'Cambiar portada'}
                      </button>
                    )}
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
                  />
                  {coverUrl ? (
                    <ImagePositionPicker
                      src={coverUrl}
                      value={coverPosition}
                      onChange={setCoverPosition}
                      zoom={coverZoom}
                      onZoomChange={setCoverZoom}
                      frameClassName="w-full h-32 rounded-xl border-2 border-neutral-200"
                      sizes="500px"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors group"
                    >
                      <SmartImage src={DEFAULT_ACADEMIA_COVER} alt="Portada de ejemplo" fill sizes="500px" className="object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/10">
                        {uploadingCover ? (
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        ) : (
                          <span className="text-xs font-semibold text-white bg-neutral-900/70 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" /> Subir tu portada
                          </span>
                        )}
                      </div>
                    </button>
                  )}
                  <p className="text-[11px] text-neutral-400 mt-1.5">Esta es una portada de ejemplo — puedes reemplazarla ahora o después desde tu perfil.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step de confirmación — siempre el último, ver STEPS_PROFESOR/STEPS_ACADEMIA */}
          {step === STEPS.length - 1 && (
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
                {form.nationality && (
                  <div className="flex justify-between p-3 bg-neutral-50 rounded-xl text-sm">
                    <span className="text-neutral-500">Nacionalidad</span>
                    <span className="font-semibold text-neutral-900">{form.nationality}</span>
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
                {(form.instagram || form.tiktok || form.youtube) && (
                  <div className="flex justify-between p-3 bg-neutral-50 rounded-xl text-sm">
                    <span className="text-neutral-500">Redes</span>
                    <span className="font-semibold text-neutral-900">
                      {[form.instagram, form.tiktok, form.youtube].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-neutral-200 rounded-xl mt-4">
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
              <div className="mt-4 p-4 bg-primary-bg rounded-xl">
                <p className="text-sm font-semibold text-primary-dark mb-1">🎉 ¡Ya casi!</p>
                <p className="text-xs text-primary-dark/80">Al guardar tu perfil podrás publicar tu primera clase.</p>
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
                className="flex items-center gap-2 px-5 py-3 border border-neutral-900 rounded-btn text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors active:scale-[0.97]"
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
