'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { Save, Upload, Loader2, LogOut, X, Building2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updateProfile } from '@/lib/profiles/actions';
import { uploadProfileImage } from '@/lib/profiles/imageActions';
import { createClient } from '@/lib/supabase/client';
import ImagePositionPicker from '@/components/ImagePositionPicker';
import SmartImage from '@/components/SmartImage';
import { NATIONALITIES } from '@/lib/nationalities';
import { getImageDimensions, MIN_IMAGE_DIMENSION } from '@/lib/imageDimensions';
import { DEFAULT_ACADEMIA_COVER } from '@/lib/utils';

// Extracts the storage object path from a public Supabase Storage URL
// (".../object/public/class-images/<path>" -> "<path>") so a replaced or
// removed photo's old file can be cleaned up instead of left orphaned.
function storagePathFromUrl(url: string): string | null {
  const marker = '/object/public/class-images/';
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// Single source of truth for WhatsApp country codes — both the <select>
// options and parseWa() read from this, so adding/removing a code can't
// desync the two and silently reintroduce the number-truncation bug below.
const WA_CODES = [
  { code: '+51', flag: '🇵🇪' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+34', flag: '🇪🇸' },
  { code: '+57', flag: '🇨🇴' },
  { code: '+56', flag: '🇨🇱' },
  { code: '+54', flag: '🇦🇷' },
  { code: '+52', flag: '🇲🇽' },
  { code: '+58', flag: '🇻🇪' },
  { code: '+593', flag: '🇪🇨' },
] as const;
// Longest code first: matching must try "+593" before "+51" etc., or a
// shorter code that happens to be a prefix would match first and steal
// leading digits from the actual phone number.
const WA_CODES_BY_LENGTH = [...WA_CODES].sort((a, b) => b.code.length - a.code.length);

interface ProfileStyleRow {
  style_id: number;
  dance_styles: { name: string } | null;
}

interface Profile {
  name: string | null;
  bio: string | null;
  nationality: string | null;
  years_experience: number | null;
  ruc: string | null;
  whatsapp: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  photo_url: string | null;
  photo_position: string | null;
  photo_zoom: number | null;
  team_size: string | null;
  branch_count: string | null;
  cover_image_url: string | null;
  cover_image_position: string | null;
  cover_image_zoom: number | null;
  profile_styles: ProfileStyleRow[] | null;
}

interface PrimaryVenue {
  address: string | null;
  district: string | null;
  city: string | null;
}

type Role = 'alumno' | 'profesor' | 'academia';

export default function PerfilClient({
  role,
  profile,
  primaryVenue,
  danceStyles,
}: {
  role: Role;
  profile: Profile;
  primaryVenue: PrimaryVenue | null;
  danceStyles: string[];
}) {
  const isTeacher = role !== 'alumno';
  const isAcademia = role === 'academia';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const waInputRef = useRef<HTMLInputElement>(null);
  const instagramInputRef = useRef<HTMLInputElement>(null);
  // Deep-link landing target from the contact-gating CTA (?missing=whatsapp,instagram#contacto).
  const [highlightField, setHighlightField] = useState<'whatsapp' | 'instagram' | null>(null);

  // Photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url ?? '');
  const [photoPosition, setPhotoPosition] = useState(profile.photo_position ?? '50% 50%');
  const [photoZoom, setPhotoZoom] = useState(profile.photo_zoom ?? 1);

  // Cover (Academia)
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(profile.cover_image_url ?? '');
  const [coverPosition, setCoverPosition] = useState(profile.cover_image_position ?? '50% 50%');
  const [coverZoom, setCoverZoom] = useState(profile.cover_image_zoom ?? 1);

  // Basic Info
  const [name, setName] = useState(profile.name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [nationality, setNationality] = useState(profile.nationality ?? '');
  const [years, setYears] = useState(String(profile.years_experience ?? ''));
  const [styles, setStyles] = useState<string[]>(
    (profile.profile_styles ?? []).map(ps => ps.dance_styles?.name ?? '').filter(Boolean)
  );

  // Corporate Info (Academia)
  const [ruc, setRuc] = useState(profile.ruc ?? '');
  const [teamSize, setTeamSize] = useState(profile.team_size ?? '');
  const [branchCount, setBranchCount] = useState(profile.branch_count ?? '');
  const [address, setAddress] = useState(primaryVenue?.address ?? '');
  const [district, setDistrict] = useState(primaryVenue?.district ?? '');
  const [city, setCity] = useState(primaryVenue?.city ?? 'Lima');

  const parseWa = (wa: string) => {
    if (!wa) return { code: '+51', number: '' };
    const match = WA_CODES_BY_LENGTH.find(c => wa.startsWith(c.code));
    if (match) {
      return { code: match.code, number: wa.slice(match.code.length).replace(/\D/g, '') };
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

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('La foto debe ser menor a 5MB'); return; }
    try {
      const { width, height } = await getImageDimensions(file);
      if (Math.min(width, height) < MIN_IMAGE_DIMENSION) {
        setError(`La imagen es muy pequeña (${width}×${height}px). Sube una de al menos ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px para que se vea bien en las tarjetas.`);
        return;
      }
    } catch {
      setError('No se pudo leer la imagen. Intenta con otro archivo.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const previousPath = storagePathFromUrl(photoUrl);
      const formData = new FormData();
      formData.set('file', file);
      const { url } = await uploadProfileImage(formData, 'photo');
      setPhotoUrl(url);
      setPhotoPosition('50% 50%');
      setPhotoZoom(1);
      await updateProfile({ photo_url: url, photo_position: '50% 50%', photo_zoom: 1 });
      if (previousPath) createClient().storage.from('class-images').remove([previousPath]);
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
    const previousPath = storagePathFromUrl(photoUrl);
    setPhotoUrl('');
    setPhotoPosition('50% 50%');
    setPhotoZoom(1);
    if (photoInputRef.current) photoInputRef.current.value = '';
    try {
      await updateProfile({ photo_url: '', photo_position: '50% 50%', photo_zoom: 1 });
      if (previousPath) createClient().storage.from('class-images').remove([previousPath]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la foto');
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('La portada debe ser menor a 5MB'); return; }
    setUploadingCover(true);
    try {
      const previousPath = storagePathFromUrl(coverUrl);
      const formData = new FormData();
      formData.set('file', file);
      const { url } = await uploadProfileImage(formData, 'cover');
      setCoverUrl(url);
      setCoverPosition('50% 50%');
      setCoverZoom(1);
      await updateProfile({ cover_image_url: url, cover_image_position: '50% 50%', cover_image_zoom: 1 });
      if (previousPath) createClient().storage.from('class-images').remove([previousPath]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir portada');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverPositionDragEnd = (position: string) => {
    updateProfile({ cover_image_position: position }).catch(err => {
      setError(err instanceof Error ? err.message : 'Error al guardar la posición de la portada');
    });
  };

  const handleCoverZoomDragEnd = (zoom: number) => {
    updateProfile({ cover_image_zoom: zoom }).catch(err => {
      setError(err instanceof Error ? err.message : 'Error al guardar el zoom de la portada');
    });
  };

  const handleRemoveCover = async () => {
    const previousPath = storagePathFromUrl(coverUrl);
    setCoverUrl('');
    setCoverPosition('50% 50%');
    setCoverZoom(1);
    if (coverInputRef.current) coverInputRef.current.value = '';
    try {
      await updateProfile({ cover_image_url: '', cover_image_position: '50% 50%', cover_image_zoom: 1 });
      if (previousPath) createClient().storage.from('class-images').remove([previousPath]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la portada');
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
    if (isTeacher && !whatsappFull && !instagram) {
      setError('Ingresa al menos tu WhatsApp o Instagram para que los alumnos puedan contactarte.');
      return;
    }
    startTransition(async () => {
      try {
        await updateProfile({
          name,
          bio,
          nationality,
          years_experience: years ? parseInt(years) : undefined,
          ruc: isAcademia ? (ruc || '') : undefined,
          team_size: isAcademia ? (teamSize || '') : undefined,
          branch_count: isAcademia ? (branchCount || '') : undefined,
          whatsapp: waNumber ? `${waCode}${waNumber}` : '',
          instagram,
          tiktok,
          youtube,
          website,
          style_names: styles,
          primary_venue: isAcademia ? {
            address: address.trim(),
            district: district.trim() || undefined,
            city: city.trim() || undefined,
          } : undefined,
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
        <p className="text-neutral-500 text-sm mt-1">
          {isTeacher ? 'Esto es lo que verán los alumnos en tu página pública' : 'Actualiza tu información personal'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Photo / Logo */}
        <div className="bg-white rounded-xl border border-neutral-900 p-6">
          <h2 className="text-lg font-bold text-neutral-900">{isAcademia ? 'Logo de la academia' : isTeacher ? 'Foto / Logo' : 'Foto de perfil'}</h2>
          {isTeacher && (
            <p className="text-xs text-neutral-500 mt-0.5 mb-4">Esto es lo que verán los alumnos en tu perfil público</p>
          )}
          <div className={`flex flex-col sm:flex-row items-start gap-6 ${isTeacher ? '' : 'mt-4'}`}>
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
                {uploadingPhoto ? 'Subiendo…' : photoUrl ? (isAcademia ? 'Cambiar logo' : 'Cambiar foto') : (isAcademia ? 'Subir logo' : 'Subir foto')}
              </button>
              <p className="text-xs text-neutral-400 mt-2">PNG, JPG o WEBP · Máx. 5MB · Recomendado 400×400px</p>
            </div>
          </div>
        </div>

        {/* Cover Photo (Academia only) */}
        {isAcademia && (
          <div className="bg-white rounded-xl border border-neutral-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Portada de la academia</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Se muestra en el banner superior de tu perfil público</p>
              </div>
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
              <div className="relative">
                <ImagePositionPicker
                  src={coverUrl}
                  value={coverPosition}
                  onChange={setCoverPosition}
                  onDragEnd={handleCoverPositionDragEnd}
                  zoom={coverZoom}
                  onZoomChange={setCoverZoom}
                  onZoomDragEnd={handleCoverZoomDragEnd}
                  frameClassName="w-full h-40 rounded-xl border border-neutral-200"
                  sizes="600px"
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors active:scale-90 z-10"
                  aria-label="Eliminar portada"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors group"
                >
                  <SmartImage src={DEFAULT_ACADEMIA_COVER} alt="Portada de ejemplo" fill sizes="600px" className="object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    {uploadingCover ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : (
                      <span className="text-xs font-semibold text-white bg-neutral-900/70 px-3.5 py-2 rounded-full flex items-center gap-1.5">
                        <Upload className="w-4 h-4" /> Subir tu portada
                      </span>
                    )}
                  </div>
                </button>
                <p className="text-xs text-neutral-400 mt-2">PNG, JPG o WEBP · Máx. 5MB</p>
              </div>
            )}
          </div>
        )}

        {/* Corporate details (Academia only) */}
        {isAcademia && (
          <div className="bg-white rounded-xl border border-neutral-900 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-pink-600" />
              <h2 className="text-lg font-bold text-neutral-900">Datos de la academia</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">RUC (opcional)</label>
              <input
                type="text"
                value={ruc}
                onChange={e => setRuc(e.target.value)}
                placeholder="20123456789"
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Tamaño del equipo</label>
                <select
                  value={teamSize}
                  onChange={e => setTeamSize(e.target.value)}
                  className="input appearance-none cursor-pointer bg-white"
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
                  value={branchCount}
                  onChange={e => setBranchCount(e.target.value)}
                  className="input appearance-none cursor-pointer bg-white"
                >
                  <option value="">Seleccionar…</option>
                  <option value="1">1 sede</option>
                  <option value="2-3">2-3 sedes</option>
                  <option value="4+">4+ sedes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Dirección de la sede principal</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Av. Benavides 1234"
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Distrito</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="Ej. Miraflores"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ciudad</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Lima"
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white rounded-xl border border-neutral-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Información pública</h2>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isAcademia ? 'Nombre de la academia' : 'Nombre público'}
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Bio corta</label>
            <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}
              className="input resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nacionalidad</label>
            <select
              value={nationality}
              onChange={e => setNationality(e.target.value)}
              className="input appearance-none cursor-pointer"
            >
              <option value="">Seleccionar…</option>
              {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {isTeacher && !isAcademia && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Años de experiencia</label>
              <input type="number" min="0" value={years} onChange={e => setYears(e.target.value)}
                className="input" />
            </div>
          )}
        </div>

        {/* Styles */}
        {isTeacher && (
          <div className="bg-white rounded-xl border border-neutral-900 p-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">{isAcademia ? 'Estilos que ofrece la academia' : 'Estilos que enseñas'}</h2>
            <div className="flex flex-wrap gap-2">
              {danceStyles.map(s => (
                <button key={s} onClick={() => toggleStyle(s)}
                  className={styles.includes(s) ? 'tag-active' : 'tag'}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contact & social */}
        {isTeacher && (
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
                  {WA_CODES.map(({ code, flag }) => (
                    <option key={code} value={code}>{flag} {code}</option>
                  ))}
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
        )}

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
