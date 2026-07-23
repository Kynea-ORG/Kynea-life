'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { Save, Upload, Loader2, LogOut, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updateProfile } from '@/lib/profiles/actions';
import { createClient } from '@/lib/supabase/client';
import ImagePositionPicker from '@/components/ImagePositionPicker';
import type { DbDistrict } from '@/lib/types';

interface ProfileStyleRow {
  style_id: number;
  dance_styles: { name: string } | null;
}

interface Profile {
  name: string | null;
  bio: string | null;
  years_experience: number | null;
  whatsapp: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  photo_url: string | null;
  photo_position: string | null;
  photo_zoom: number | null;
  district: { name: string; city: string } | null;
  profile_styles: ProfileStyleRow[] | null;
}

export default function PerfilClient({
  profile,
  danceStyles,
  allDistricts,
}: {
  profile: Profile;
  danceStyles: string[];
  allDistricts: DbDistrict[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const waInputRef = useRef<HTMLInputElement>(null);
  const instagramInputRef = useRef<HTMLInputElement>(null);
  // Deep-link landing target from the contact-gating CTA (?missing=whatsapp,instagram#contacto).
  const [highlightField, setHighlightField] = useState<'whatsapp' | 'instagram' | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url ?? '');
  const [photoPosition, setPhotoPosition] = useState(profile.photo_position ?? '50% 50%');
  const [photoZoom, setPhotoZoom] = useState(profile.photo_zoom ?? 1);

  const [name, setName] = useState(profile.name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [city, setCity] = useState(profile.district?.city ?? 'Lima');
  const [district, setDistrict] = useState(profile.district?.name ?? '');
  const [years, setYears] = useState(String(profile.years_experience ?? ''));
  const [styles, setStyles] = useState<string[]>(
    (profile.profile_styles ?? []).map(ps => ps.dance_styles?.name ?? '').filter(Boolean)
  );

  const parseWa = (wa: string) => {
    const CODES = ['+51', '+1', '+34', '+57', '+56', '+54', '+52', '+58', '+593'];
    if (!wa) return { code: '+51', number: '' };
    const m = wa.match(/^(\+\d{1,3})(.*)/);
    if (m) {
      const code = CODES.find(c => c === m[1]) ?? '+51';
      return { code, number: m[2].trim().replace(/\D/g, '') };
    }
    return { code: '+51', number: wa.replace(/\D/g, '') };
  };
  const parsed = parseWa(profile.whatsapp ?? '');
  const [waCode, setWaCode] = useState(parsed.code);
  const [waNumber, setWaNumber] = useState(parsed.number);
  const [instagram, setInstagram] = useState(profile.instagram ?? '');
  const [tiktok, setTiktok] = useState(profile.tiktok ?? '');
  const [youtube, setYoutube] = useState(profile.youtube ?? '');
  const [website, setWebsite] = useState(profile.website ?? '');

  const toggleStyle = (s: string) => {
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const CITIES = [...new Set(allDistricts.map(d => d.city))].sort();
  const districtsByCity = allDistricts.filter(d => d.city === city);

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { setError('La foto debe ser menor a 2MB'); return; }
    setUploadingPhoto(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');
      const ext = file.name.split('.').pop() ?? 'jpg';
      // Timestamped path (not a fixed "profile.<ext>" name) so a re-upload gets
      // a brand-new public URL — reusing the same URL would let the browser/CDN
      // keep serving the previous cached image after replacing the file.
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('class-images').upload(path, file);
      if (upErr) throw new Error(upErr.message);
      const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path);
      setPhotoUrl(publicUrl);
      setPhotoPosition('50% 50%');
      setPhotoZoom(1);
      await updateProfile({ photo_url: publicUrl, photo_position: '50% 50%', photo_zoom: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoPositionDragEnd = (position: string) => {
    updateProfile({ photo_position: position }).catch(err => {
      setError(err instanceof Error ? err.message : 'Error al guardar la posición de la foto');
    });
  };

  const handlePhotoZoomDragEnd = (zoom: number) => {
    updateProfile({ photo_zoom: zoom }).catch(err => {
      setError(err instanceof Error ? err.message : 'Error al guardar el zoom de la foto');
    });
  };

  const handleRemovePhoto = async () => {
    setPhotoUrl('');
    setPhotoPosition('50% 50%');
    setPhotoZoom(1);
    if (photoInputRef.current) photoInputRef.current.value = '';
    try {
      await updateProfile({ photo_url: '', photo_position: '50% 50%', photo_zoom: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la foto');
    }
  };

  // Land on the missing contact field(s) when arriving via the publish
  // contact-gating deep link (?missing=whatsapp,instagram#contacto).
  useEffect(() => {
    const missing = searchParams.get('missing');
    if (!missing) return;
    const fields = missing.split(',').filter((f): f is 'whatsapp' | 'instagram' => f === 'whatsapp' || f === 'instagram');
    const first = fields[0];
    const target = first === 'whatsapp' ? waInputRef.current : first === 'instagram' ? instagramInputRef.current : null;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus();
    setHighlightField(first);
    const timer = setTimeout(() => setHighlightField(null), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleSave = () => {
    setError('');
    setSaved(false);
    const whatsappFull = waNumber ? `${waCode}${waNumber}` : '';
    if (!whatsappFull && !instagram) {
      setError('Ingresa al menos tu WhatsApp o Instagram para que los alumnos puedan contactarte.');
      return;
    }
    startTransition(async () => {
      try {
        await updateProfile({
          name,
          bio,
          district_name: district || undefined,
          district_city: district ? city : undefined,
          years_experience: years ? parseInt(years) : undefined,
          whatsapp: waNumber ? `${waCode}${waNumber}` : '',
          instagram,
          tiktok,
          youtube,
          website,
          style_names: styles,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Mi perfil</h1>
        <p className="text-neutral-500 text-sm mt-1">Esto es lo que verán los alumnos en tu página pública</p>
      </div>

      <div className="space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-xl border border-neutral-900 p-6">
          <h2 className="text-lg font-bold text-neutral-900">Foto / Logo</h2>
          <p className="text-xs text-neutral-500 mt-0.5 mb-4">Esto es lo que verán los alumnos en tu perfil público</p>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
            />
            <div className="w-32 shrink-0">
              {photoUrl ? (
                <div className="relative">
                  <ImagePositionPicker
                    src={photoUrl}
                    value={photoPosition}
                    onChange={setPhotoPosition}
                    onDragEnd={handlePhotoPositionDragEnd}
                    zoom={photoZoom}
                    onZoomChange={setPhotoZoom}
                    onZoomDragEnd={handlePhotoZoomDragEnd}
                    frameClassName="w-32 h-32 rounded-xl border border-neutral-200"
                    sizes="128px"
                    compact
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors active:scale-90 z-10"
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
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center bg-neutral-50 disabled:opacity-50"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
                  ) : name ? (
                    <span className="text-3xl font-bold text-neutral-400">{name.charAt(0).toUpperCase()}</span>
                  ) : (
                    <Upload className="w-6 h-6 text-neutral-400" />
                  )}
                </button>
              )}
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="btn-outline btn-sm disabled:opacity-50"
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingPhoto ? 'Subiendo…' : photoUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <p className="text-xs text-neutral-400 mt-2">PNG o JPG · Máx. 2MB</p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-xl border border-neutral-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Información pública</h2>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nombre público</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Bio corta</label>
            <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}
              className="input resize-none" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ciudad</label>
              <select
                value={city}
                onChange={e => { setCity(e.target.value); setDistrict(''); }}
                className="input appearance-none cursor-pointer"
              >
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Distrito</label>
              <select
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="input appearance-none cursor-pointer"
              >
                <option value="">Seleccionar distrito…</option>
                {districtsByCity.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Años de experiencia</label>
              <input type="number" min="0" value={years} onChange={e => setYears(e.target.value)}
                className="input" />
            </div>
          </div>
        </div>

        {/* Styles */}
        <div className="bg-white rounded-xl border border-neutral-900 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Estilos que enseñas</h2>
          <div className="flex flex-wrap gap-2">
            {danceStyles.map(s => (
              <button key={s} onClick={() => toggleStyle(s)}
                className={styles.includes(s) ? 'tag-active' : 'tag'}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Contact & social */}
        <div id="contacto" className="bg-white rounded-xl border border-neutral-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Contacto y redes</h2>
          <p className="text-xs text-neutral-400"><span className="text-red-500">*</span> Al menos WhatsApp o Instagram es obligatorio</p>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">WhatsApp <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select
                value={waCode}
                onChange={e => setWaCode(e.target.value)}
                className="input appearance-none cursor-pointer w-auto shrink-0"
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
                ref={waInputRef}
                id="field-whatsapp"
                type="tel"
                value={waNumber}
                onChange={e => setWaNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="999 999 999"
                className={`input flex-1 ${
                  highlightField === 'whatsapp' ? '!border-amber-400 ring-2 ring-amber-200' : ''
                }`}
              />
            </div>
            <p className="text-xs text-neutral-400 mt-1">Solo números, sin ceros iniciales ni guiones. Ej: 999999999</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Instagram<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              ref={instagramInputRef}
              id="field-instagram"
              type="text"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="Tu instagram"
              className={`input ${
                highlightField === 'instagram' ? '!border-amber-400 ring-2 ring-amber-200' : ''
              }`}
            />
          </div>

          {[
            { label: 'TikTok', value: tiktok, set: setTiktok },
            { label: 'YouTube', value: youtube, set: setYoutube },
            { label: 'Sitio web', value: website, set: setWebsite },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{f.label}</label>
              <input type="text" value={f.value} onChange={e => f.set(e.target.value)}
                placeholder={`Tu ${f.label.toLowerCase()}`}
                className="input" />
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in">{error}</div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn-dark disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? '¡Guardado!' : isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-red-500 hover:bg-red-50 px-4 py-3 rounded-btn border border-neutral-200 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
