'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Loader2, Upload, Building2 } from 'lucide-react';
import { requestAcademiaConversion } from '@/lib/profiles/actions';
import { createClient } from '@/lib/supabase/client';
import ImagePositionPicker from '@/components/ImagePositionPicker';
import SmartImage from '@/components/SmartImage';
import PlacesAddressField from '@/components/PlacesAddressField';
import { DEFAULT_ACADEMIA_COVER } from '@/lib/utils';

const STEPS = ['Sobre tu academia', 'Ubicación y marca'];

// Pantalla propia (no un wizard inline en /dashboard) — la card de ahí es
// muy ancha para un formulario paso a paso; ver AcademiaConversionCard.tsx.
export default function ConvertirAcademiaClient({
  initialName,
  initialPhotoUrl,
  initialPhotoPosition,
  initialPhotoZoom,
}: {
  initialName: string;
  initialPhotoUrl: string;
  initialPhotoPosition: string;
  initialPhotoZoom: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: initialName,
    ruc: '',
    teamSize: '',
    branchCount: '',
    address: '',
    placeId: '',
    lat: '',
    lng: '',
    district: '',
    city: 'Lima',
  });
  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));

  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [photoPosition, setPhotoPosition] = useState(initialPhotoPosition);
  const [photoZoom, setPhotoZoom] = useState(initialPhotoZoom);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [coverUrl, setCoverUrl] = useState('');
  const [coverPosition, setCoverPosition] = useState('50% 50%');
  const [coverZoom, setCoverZoom] = useState(1);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  async function uploadTo(file: File, suffix: string, onDone: (url: string) => void, setLoading: (v: boolean) => void) {
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB.'); return; }
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/${Date.now()}-${suffix}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('class-images').upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path);
      onDone(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await requestAcademiaConversion({
        name: form.name.trim() || undefined,
        ruc: form.ruc.trim() || undefined,
        teamSize: form.teamSize || undefined,
        branchCount: form.branchCount || undefined,
        address: form.address.trim() || undefined,
        placeId: form.placeId || undefined,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        district: form.district.trim() || undefined,
        city: form.city.trim() || undefined,
        photoUrl: photoUrl !== initialPhotoUrl ? photoUrl : undefined,
        photoPosition: photoUrl !== initialPhotoUrl ? photoPosition : undefined,
        photoZoom: photoUrl !== initialPhotoUrl ? photoZoom : undefined,
        coverImageUrl: coverUrl || undefined,
        coverImagePosition: coverUrl ? coverPosition : undefined,
        coverImageZoom: coverUrl ? coverZoom : undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-center relative">
        <Image src="/logo.png" alt="Kynea" width={100} height={32} />
        <Link href="/dashboard" className="absolute left-6 top-1/2 -translate-y-1/2 text-sm text-neutral-500 hover:text-neutral-800 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </Link>
      </header>

      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-pink-50 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900">Convertir a academia</h1>
              <p className="text-sm text-neutral-500">No pierdes tus clases ni tu perfil actual — todo es opcional</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-neutral-700">
                Paso {step + 1} de {STEPS.length}: {STEPS[step]}
              </span>
              <span className="text-xs text-neutral-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-neutral-200'}`} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-neutral-900 shadow-xl p-8">
            {error && (
              <p className="mb-4 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fade-in">{error}</p>
            )}

            {step === 0 && (
              <div className="animate-fade-in space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nombre de la academia</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">RUC (opcional)</label>
                  <input
                    type="text"
                    value={form.ruc}
                    onChange={e => set('ruc', e.target.value)}
                    placeholder="20123456789"
                    className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                  />
                </div>
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
              </div>
            )}

            {step === 1 && (
              <div className="animate-fade-in space-y-4">
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
                      value={form.district}
                      onChange={e => set('district', e.target.value)}
                      placeholder="Ej. Miraflores"
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ciudad</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder="Lima"
                      className="w-full border-2 border-neutral-200 rounded-btn px-4 py-3 text-sm text-neutral-800 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Logo</label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadTo(f, 'logo', url => { setPhotoUrl(url); setPhotoPosition('50% 50%'); setPhotoZoom(1); }, setUploadingPhoto); }}
                  />
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-200 bg-neutral-100 shrink-0 flex items-center justify-center">
                      {photoUrl
                        ? <SmartImage src={photoUrl} alt="Logo" fill sizes="56px" className="object-cover" style={{ objectPosition: photoPosition, transform: `scale(${photoZoom})` }} />
                        : <span className="text-lg font-black text-neutral-400">{form.name.charAt(0) || '?'}</span>
                      }
                    </div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs font-semibold text-primary hover:text-primary-dark"
                    >
                      {uploadingPhoto ? 'Subiendo…' : photoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Portada de tu perfil</label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadTo(f, 'cover', url => { setCoverUrl(url); setCoverPosition('50% 50%'); setCoverZoom(1); }, setUploadingCover); }}
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
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
                  <p className="text-[11px] text-neutral-400 mt-1.5">Esta es una portada de ejemplo — puedes reemplazarla ahora o después.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 border border-neutral-900 rounded-btn text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors active:scale-[0.97]"
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
              )}
              <button
                onClick={step === STEPS.length - 1 ? handleSubmit : () => setStep(s => s + 1)}
                disabled={submitting}
                className="btn-dark flex-1 disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Enviando…' : step === STEPS.length - 1 ? 'Enviar solicitud' : 'Continuar'}
                {!submitting && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
