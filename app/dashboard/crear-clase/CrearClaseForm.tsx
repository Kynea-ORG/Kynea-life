'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Save,
  Upload, MapPin, Monitor, Loader2, X,
} from 'lucide-react';
import { DANCE_STYLES, LEVELS } from '@/lib/mockData';
import { createClass, updateClassFromForm } from '@/lib/actions/classes';
import { createClient } from '@/lib/supabase/client';
import type { DanceClass } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Información básica' },
  { label: 'Horario y ubicación' },
  { label: 'Precio y detalles' },
  { label: 'Revisión y publicación' },
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type Slot = { startDate?: string; endDate?: string; days: string[]; startTime: string; endTime: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SegmentedProgress({ step }: { step: number }) {
  return (
    <div className="mb-8">
      {/* Step labels with numbered circles */}
      <div className="flex items-center gap-x-3 mb-3 flex-wrap gap-y-2">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-[13px] font-semibold transition-colors ${
              i === step ? 'text-neutral-900' : i < step ? 'text-neutral-400' : 'text-neutral-300'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${
              i < step  ? 'bg-neutral-900 text-white' :
              i === step ? 'bg-neutral-900 text-white' :
              'bg-neutral-200 text-neutral-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:block">{s.label}</span>
            {i < STEPS.length - 1 && (
              <span className="text-neutral-300 hidden sm:block select-none">›</span>
            )}
          </div>
        ))}
      </div>
      {/* Segmented progress bar */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-neutral-900' : 'bg-neutral-100'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 border-2 text-sm font-semibold transition-all ${
        active ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{children}</label>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-neutral-400 mt-1">{children}</p>;
}

function NativeSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="input appearance-none cursor-pointer">
      {children}
    </select>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface Props {
  classId: string | null;
  editClass: DanceClass | null;
}

export default function CrearClaseForm({ classId, editClass }: Props) {
  useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [customToBring, setCustomToBring] = useState('');

  const [slots, setSlots] = useState<Slot[]>([
    { days: [], startTime: '19:00', endTime: '20:30' },
  ]);

  const [form, setForm] = useState({
    type: 'clase',
    title: '',
    style: '',
    level: '',
    shortDesc: '',
    fullDesc: '',
    startDate: '',
    endDate: '',
    recurrence: 'mensual',
    priceType: 'Mensual',
    price: '',
    offerPrice: '',
    currency: 'PEN',
    maxSpots: '',
    contactMode: 'whatsapp',
    modality: 'Presencial',
    city: 'Lima',
    district: '',
    address: '',
    reference: '',
    mapsUrl: '',
    platform: '',
    accessLink: '',
    videoUrl: '',
    footwear: '',
    clothing: '',
    prerequisites: '',
    ageGroup: '',
    toBring: [] as string[],
    status: 'draft',
  });

  useEffect(() => {
    if (!editClass) return;
    setForm({
      type: editClass.type ?? 'clase',
      title: editClass.title ?? '',
      style: editClass.style ?? '',
      level: editClass.level ?? '',
      shortDesc: editClass.shortDescription ?? '',
      fullDesc: editClass.fullDescription ?? '',
      startDate: editClass.startDate ?? '',
      endDate: editClass.endDate ?? '',
      recurrence: 'mensual',
      priceType: editClass.priceType ?? 'Mensual',
      price: editClass.price ? String(editClass.price) : '',
      offerPrice: editClass.offerPrice ? String(editClass.offerPrice) : '',
      currency: editClass.currency ?? 'PEN',
      maxSpots: editClass.maxSpots ? String(editClass.maxSpots) : '',
      contactMode: editClass.contactMode ?? 'whatsapp',
      modality: editClass.modality ?? 'Presencial',
      city: editClass.city ?? 'Lima',
      district: editClass.district ?? '',
      address: editClass.address ?? '',
      reference: editClass.reference ?? '',
      mapsUrl: editClass.mapsUrl ?? '',
      platform: editClass.platform ?? '',
      accessLink: editClass.accessLink ?? '',
      videoUrl: editClass.videoUrl ?? '',
      footwear: editClass.footwear ?? '',
      clothing: editClass.clothing ?? '',
      prerequisites: editClass.prerequisites ?? '',
      ageGroup: editClass.ageGroup ?? '',
      toBring: editClass.toBring ?? [],
      status: editClass.status ?? 'draft',
    });
    if (editClass.coverImage) setCoverImageUrl(editClass.coverImage);
    if (editClass.timeSlots?.length) setSlots(editClass.timeSlots as Slot[]);
  }, [editClass]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Imagen mayor a 5MB'); return; }
    setUploadError('');
    setUploadingImage(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('class-images').upload(path, file);
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path);
      setCoverImageUrl(publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const addSlot = () => setSlots(s => [...s, { days: [], startTime: '19:00', endTime: '20:30' }]);
  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, key: keyof Slot, val: unknown) =>
    setSlots(s => s.map((slot, idx) => (idx === i ? { ...slot, [key]: val } : slot)));
  const toggleSlotDay = (slotIdx: number, day: string) =>
    setSlots(s =>
      s.map((slot, idx) => {
        if (idx !== slotIdx) return slot;
        const days = slot.days.includes(day) ? slot.days.filter(d => d !== day) : [...slot.days, day];
        return { ...slot, days };
      })
    );

  const goNext = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setStep(s => Math.max(s - 1, 0)); };

  const handlePublish = (status: string) => {
    setSubmitError('');
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('status', status);
        fd.set('type', form.type);
        fd.set('title', form.title);
        fd.set('style', form.style);
        fd.set('level', form.level);
        fd.set('shortDesc', form.shortDesc);
        fd.set('fullDesc', form.fullDesc);
        fd.set('startDate', form.startDate);
        fd.set('endDate', form.recurrence === 'unica' ? form.startDate : form.endDate);
        fd.set('priceType', form.priceType);
        fd.set('price', form.price);
        fd.set('offerPrice', form.offerPrice);
        fd.set('currency', form.currency);
        fd.set('maxSpots', form.maxSpots);
        fd.set('modality', form.modality);
        fd.set('city', form.city);
        fd.set('district', form.district);
        fd.set('address', form.address);
        fd.set('reference', form.reference);
        fd.set('footwear', form.footwear);
        fd.set('clothing', form.clothing);
        fd.set('prerequisites', form.prerequisites);
        fd.set('ageGroup', form.ageGroup);
        fd.set('contactMode', form.contactMode);
        const finalToBring = form.toBring.map(x =>
          x === 'Otro' && customToBring.trim() ? customToBring.trim() : x
        ).filter(x => x !== 'Otro' || customToBring.trim());
        fd.set('toBring', JSON.stringify(finalToBring));
        fd.set('timeSlots', JSON.stringify(slots));
        if (coverImageUrl) fd.set('coverImage', coverImageUrl);

        if (classId) {
          await updateClassFromForm(classId, fd);
        } else {
          await createClass(fd);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
        setSubmitError(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  };

  // ── Step 1: Información básica ────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-neutral-900 mb-5">Información básica</h2>

      <div>
        <FieldLabel>Tipo de publicación</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { value: 'clase', label: 'Clase regular', desc: 'Horario recurrente', emoji: '🎵' },
            { value: 'clase-suelta', label: 'Clase suelta', desc: 'Sesión única', emoji: '🎯' },
            { value: 'taller', label: 'Taller', desc: 'Taller puntual', emoji: '🛠️' },
            { value: 'curso', label: 'Curso', desc: 'Programa completo', emoji: '📚' },
            { value: 'masterclass', label: 'Masterclass', desc: 'Clase magistral', emoji: '⭐' },
            { value: 'evento', label: 'Evento', desc: 'Varios días seguidos', emoji: '🔥' },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => set('type', opt.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                form.type === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
              }`}>
              <p className="text-xl mb-1">{opt.emoji}</p>
              <p className="font-bold text-sm text-neutral-900">{opt.label}</p>
              <p className="text-xs text-neutral-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Título de la clase *</FieldLabel>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Ej: Salsa Básico desde cero" maxLength={80} />
        <Hint>{form.title.length}/80 caracteres</Hint>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Estilo de baile *</FieldLabel>
          <NativeSelect value={form.style} onChange={e => set('style', e.target.value)}>
            <option value="">Seleccionar estilo…</option>
            {DANCE_STYLES.map(s => <option key={s}>{s}</option>)}
          </NativeSelect>
        </div>
        <div>
          <FieldLabel>Nivel *</FieldLabel>
          <NativeSelect value={form.level} onChange={e => set('level', e.target.value)}>
            <option value="">Seleccionar nivel…</option>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </NativeSelect>
        </div>
      </div>

      <div>
        <FieldLabel>Descripción corta <span className="font-normal text-neutral-400">(máx. 120 caracteres)</span></FieldLabel>
        <input className="input" value={form.shortDesc} onChange={e => set('shortDesc', e.target.value)}
          placeholder="Aprende los fundamentos en un ambiente divertido…" maxLength={120} />
        <Hint>{form.shortDesc.length}/120 caracteres — se muestra en la tarjeta</Hint>
      </div>

      <div>
        <FieldLabel>Descripción completa</FieldLabel>
        <textarea rows={5} value={form.fullDesc} onChange={e => set('fullDesc', e.target.value)}
          placeholder="Cuéntanos todo sobre la clase: qué aprenderán, para quién es, dinámica, requisitos…"
          className="input resize-none" />
      </div>

      {/* Cover image upload */}
      <div>
        <FieldLabel>Imagen de portada</FieldLabel>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        />

        {coverImageUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-neutral-200">
            <img src={coverImageUrl} alt="Portada" className="w-full h-48 object-cover" />
            <button
              type="button"
              onClick={() => { setCoverImageUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-neutral-400 transition-colors cursor-pointer group"
          >
            {uploadingImage ? (
              <Loader2 className="w-10 h-10 text-neutral-400 mx-auto mb-3 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-neutral-300 group-hover:text-neutral-400 mx-auto mb-3 transition-colors" />
            )}
            <p className="text-sm font-semibold text-neutral-600">
              {uploadingImage ? 'Subiendo imagen…' : 'Arrastra tu imagen o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WebP · Máx. 5 MB</p>
          </div>
        )}

        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        <Hint>Recomendado: 1200×630 px, formato JPG o PNG</Hint>
      </div>
    </div>
  );

  // ── Step 2: Horario y ubicación ───────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-neutral-900 mb-5">Horario y ubicación</h2>

      {/* Recurrence type — FIRST */}
      <div>
        <FieldLabel>Tipo de recurrencia</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'unica', label: 'Clase única' },
            { value: 'mensual', label: 'Mensual' },
            { value: 'personalizado', label: 'Personalizado' },
          ].map(opt => (
            <Pill key={opt.value} active={form.recurrence === opt.value} onClick={() => {
              set('recurrence', opt.value);
              setSlots([{ days: [], startTime: '19:00', endTime: '20:30' }]);
            }}>
              {opt.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* CLASE ÚNICA */}
      {form.recurrence === 'unica' && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Fecha de la clase</FieldLabel>
              <input type="date" className="input" value={form.startDate}
                onChange={e => { set('startDate', e.target.value); set('endDate', e.target.value); }} />
            </div>
            <div>
              <FieldLabel>Fecha de fin</FieldLabel>
              <input type="date" className="input" value={form.startDate} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Hora inicio</FieldLabel>
              <input type="time" className="input" value={slots[0].startTime}
                onChange={e => updateSlot(0, 'startTime', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Hora fin</FieldLabel>
              <input type="time" className="input" value={slots[0].endTime}
                onChange={e => updateSlot(0, 'endTime', e.target.value)} />
            </div>
          </div>
          {form.startDate && (
            <div className="text-xs text-neutral-600 bg-white px-3 py-2.5 rounded-lg border border-neutral-200">
              1 sesión el <span className="font-semibold">
                {new Date(form.startDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span> de {slots[0].startTime} a {slots[0].endTime}
            </div>
          )}
        </>
      )}

      {/* MENSUAL */}
      {form.recurrence === 'mensual' && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Fecha de inicio</FieldLabel>
              <input type="date" className="input" value={form.startDate}
                onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Fecha de fin</FieldLabel>
              <input type="date" className="input" value={form.endDate}
                onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-2">Días de la semana</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleSlotDay(0, d)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border-2 font-semibold transition-colors ${
                    slots[0].days.includes(d) ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                  }`}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Hora inicio</FieldLabel>
              <input type="time" className="input" value={slots[0].startTime}
                onChange={e => updateSlot(0, 'startTime', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Hora fin</FieldLabel>
              <input type="time" className="input" value={slots[0].endTime}
                onChange={e => updateSlot(0, 'endTime', e.target.value)} />
            </div>
          </div>
          {(slots[0].days.length > 0 || form.startDate) && (
            <div className="text-xs text-neutral-600 bg-white px-3 py-2.5 rounded-lg border border-neutral-200">
              Desde <span className="font-semibold">{form.startDate || '—'}</span> hasta{' '}
              <span className="font-semibold">{form.endDate || '—'}</span>
              {slots[0].days.length > 0 && <>, los <span className="font-semibold">{slots[0].days.join(', ')}</span></>}
              {' '}de {slots[0].startTime} a {slots[0].endTime}
            </div>
          )}
        </>
      )}

      {/* PERSONALIZADO */}
      {form.recurrence === 'personalizado' && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Inicio del rango</FieldLabel>
              <input type="date" className="input" value={form.startDate}
                onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Fin del rango</FieldLabel>
              <input type="date" className="input" value={form.endDate}
                onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-neutral-700">Segmentos de horario</p>
              <button type="button" onClick={addSlot}
                className="flex items-center gap-1.5 text-xs text-neutral-900 font-semibold hover:bg-neutral-100 px-3 py-1.5 rounded-lg transition-colors border border-neutral-200">
                <Plus className="w-3.5 h-3.5" /> Agregar segmento
              </button>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Cada segmento define un rango de fechas + días + horario. Útil para saltar semanas o cambiar horarios dentro del período.
            </p>
            <div className="space-y-4">
              {slots.map((slot, i) => (
                <div key={i} className="border border-neutral-200 rounded-xl p-4 space-y-4 bg-neutral-50/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-700">Segmento {i + 1}</p>
                    {slots.length > 1 && (
                      <button type="button" onClick={() => removeSlot(i)} className="text-neutral-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 mb-1.5">Desde</p>
                      <input type="date" className="input" value={slot.startDate ?? ''}
                        onChange={e => updateSlot(i, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 mb-1.5">Hasta</p>
                      <input type="date" className="input" value={slot.endDate ?? ''}
                        onChange={e => updateSlot(i, 'endDate', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 mb-2">Días</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map(d => (
                        <button key={d} type="button" onClick={() => toggleSlotDay(i, d)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border-2 font-semibold transition-colors ${
                            slot.days.includes(d) ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                          }`}>
                          {d.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 mb-1.5">Hora inicio</p>
                      <input type="time" className="input" value={slot.startTime}
                        onChange={e => updateSlot(i, 'startTime', e.target.value)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 mb-1.5">Hora fin</p>
                      <input type="time" className="input" value={slot.endTime}
                        onChange={e => updateSlot(i, 'endTime', e.target.value)} />
                    </div>
                  </div>
                  {(slot.startDate || slot.days.length > 0) && (
                    <p className="text-xs text-neutral-600 bg-white px-3 py-2.5 rounded-lg border border-neutral-200">
                      {slot.startDate && <>Del {slot.startDate} al {slot.endDate || slot.startDate}, </>}
                      {slot.days.length > 0 && <>los <span className="font-semibold">{slot.days.join(', ')}</span> </>}
                      de {slot.startTime} a {slot.endTime}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modality — 2 options only */}
      <div>
        <FieldLabel>Modalidad</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'Presencial', label: 'Presencial', desc: 'En un estudio o academia', icon: MapPin },
            { value: 'Online', label: 'Online', desc: 'Por videollamada', icon: Monitor },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => set('modality', opt.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                form.modality === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
              }`}>
              <opt.icon className={`w-5 h-5 mt-0.5 shrink-0 ${form.modality === opt.value ? 'text-neutral-900' : 'text-neutral-400'}`} />
              <div>
                <p className="font-bold text-sm text-neutral-900">{opt.label}</p>
                <p className="text-xs text-neutral-500">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Location — address first */}
      {form.modality !== 'Online' && (
        <div className="space-y-4 border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
          <p className="text-xs font-bold text-neutral-700">Ubicación presencial</p>
          <div>
            <FieldLabel>Dirección</FieldLabel>
            {/* TODO: Google Places Autocomplete — add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable */}
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Av. Benavides 1234, piso 3" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Ciudad</FieldLabel>
              <NativeSelect value={form.city} onChange={e => set('city', e.target.value)}>
                {['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'].map(c => <option key={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div>
              <FieldLabel>Distrito</FieldLabel>
              <input className="input" value={form.district} onChange={e => set('district', e.target.value)}
                placeholder="Ej: Miraflores" />
            </div>
          </div>
          <div>
            <FieldLabel>Referencia</FieldLabel>
            <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)}
              placeholder="Frente al parque Kennedy" />
          </div>
        </div>
      )}

      {form.modality !== 'Presencial' && (
        <div className="space-y-4 border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
          <p className="text-xs font-bold text-neutral-700">Acceso online</p>
          <div>
            <FieldLabel>Plataforma</FieldLabel>
            <NativeSelect value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Seleccionar…</option>
              <option>Zoom</option>
              <option>Google Meet</option>
              <option>Otra</option>
            </NativeSelect>
          </div>
          <div>
            <FieldLabel>Enlace de acceso</FieldLabel>
            <input className="input" value={form.accessLink} onChange={e => set('accessLink', e.target.value)}
              placeholder="https://zoom.us/j/..." />
            <Hint>Puedes ocultarlo hasta confirmar la inscripción</Hint>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 3: Precio y detalles ─────────────────────────────────────────────
  const renderStep2 = () => {
    const otherSelected = form.toBring.includes('Otro');
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 mb-5">Precio y detalles</h2>

        <div>
          <FieldLabel>Tipo de precio</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {['Gratis', 'Por clase', 'Mensual', 'Paquete'].map(pt => (
              <Pill key={pt} active={form.priceType === pt} onClick={() => set('priceType', pt)}>{pt}</Pill>
            ))}
          </div>
        </div>

        {form.priceType !== 'Gratis' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Precio base</FieldLabel>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-bold pointer-events-none">
                    {form.currency === 'PEN' ? 'S/' : '$'}
                  </span>
                  <input type="number" className="input pl-10" value={form.price}
                    onChange={e => set('price', e.target.value)} placeholder="0" min={0} />
                </div>
              </div>
              <div>
                <FieldLabel>Moneda</FieldLabel>
                <NativeSelect value={form.currency} onChange={e => set('currency', e.target.value)}>
                  <option value="PEN">PEN – Soles</option>
                  <option value="USD">USD – Dólares</option>
                </NativeSelect>
              </div>
            </div>
            <div>
              <FieldLabel>Precio de oferta <span className="font-normal text-neutral-400">(opcional)</span></FieldLabel>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-bold pointer-events-none">
                  {form.currency === 'PEN' ? 'S/' : '$'}
                </span>
                <input type="number" className="input pl-10" value={form.offerPrice}
                  onChange={e => set('offerPrice', e.target.value)} placeholder="0" min={0} />
              </div>
              <Hint>Deja vacío si no hay descuento. El precio base se mostrará tachado.</Hint>
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Cupos máximos</FieldLabel>
          <input type="number" className="input" value={form.maxSpots}
            onChange={e => set('maxSpots', e.target.value)} placeholder="Ej: 20" min={1} />
        </div>

        <div>
          <FieldLabel>Modalidad de contacto</FieldLabel>
          <div className="space-y-2">
            {[
              { value: 'whatsapp', label: 'WhatsApp', desc: 'Los alumnos te contactan por WhatsApp' },
              { value: 'instagram', label: 'Instagram', desc: 'Los alumnos te escriben por Instagram' },
              { value: 'ambos', label: 'WhatsApp + Instagram', desc: 'Mostramos ambos botones de contacto' },
            ].map(opt => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.contactMode === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                }`}>
                <input type="radio" name="contactMode" value={opt.value}
                  checked={form.contactMode === opt.value} onChange={() => set('contactMode', opt.value)}
                  className="mt-0.5 accent-neutral-900" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{opt.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <Hint>El profesor debe tener configurado su WhatsApp o Instagram en el perfil.</Hint>
        </div>

        <div>
          <FieldLabel>Calzado recomendado</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {['Zapatillas', 'Tacos / heels', 'Medias', 'Zapatos de salsa', 'Zapatos de ballet', 'Otro'].map(opt => (
              <Pill key={opt} active={form.footwear === opt} onClick={() => set('footwear', form.footwear === opt ? '' : opt)}>{opt}</Pill>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Ropa recomendada</FieldLabel>
          <input className="input" value={form.clothing} onChange={e => set('clothing', e.target.value)}
            placeholder="Ej: Ropa cómoda y transpirable" />
        </div>

        <div>
          <FieldLabel>Requisitos previos</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {['Sin experiencia previa', 'Experiencia previa', 'Evaluación previa'].map(opt => (
              <Pill key={opt} active={form.prerequisites === opt} onClick={() => set('prerequisites', form.prerequisites === opt ? '' : opt)}>{opt}</Pill>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Edad recomendada</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {['Apto para todos', 'Niños', 'Mayor +18 años'].map(opt => (
              <Pill key={opt} active={form.ageGroup === opt} onClick={() => set('ageGroup', form.ageGroup === opt ? '' : opt)}>{opt}</Pill>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Qué llevar</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {['Agua', 'Toalla', 'Rodilleras', 'Mat', 'Otro'].map(opt => (
              <Pill key={opt} active={form.toBring.includes(opt)} onClick={() => {
                const list = form.toBring.includes(opt)
                  ? form.toBring.filter(x => x !== opt)
                  : [...form.toBring, opt];
                set('toBring', list);
                if (opt === 'Otro' && form.toBring.includes('Otro')) setCustomToBring('');
              }}>{opt}</Pill>
            ))}
          </div>
          {otherSelected && (
            <div className="mt-2">
              <input
                className="input"
                value={customToBring}
                onChange={e => setCustomToBring(e.target.value)}
                placeholder="Especificar qué llevar…"
                maxLength={60}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Step 4: Revisión y publicación ────────────────────────────────────────
  const renderStep3 = () => {
    const currSymbol = form.currency === 'PEN' ? 'S/' : '$';
    const priceLabel = form.priceType === 'Gratis'
      ? 'Gratis'
      : form.price
        ? `${currSymbol}${form.price} (${form.priceType})${form.offerPrice ? ` → oferta ${currSymbol}${form.offerPrice}` : ''}`
        : '—';
    const locationLabel = form.modality !== 'Online'
      ? [form.address, form.district, form.city].filter(Boolean).join(', ') || '—'
      : form.platform || '—';
    const slotsLabel = slots.map(s => {
      const days = s.days.join(', ') || '—';
      const range = s.startDate ? `${s.startDate}${s.endDate && s.endDate !== s.startDate ? ` – ${s.endDate}` : ''}, ` : '';
      return `${range}${days} · ${s.startTime}–${s.endTime}`;
    }).join(' | ') || '—';

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 mb-5">Revisión y publicación</h2>

        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          {[
            { label: 'Tipo', value: form.type },
            { label: 'Título', value: form.title || '—' },
            { label: 'Estilo', value: form.style || '—' },
            { label: 'Nivel', value: form.level || '—' },
            { label: 'Recurrencia', value: form.recurrence === 'unica' ? 'Clase única' : form.recurrence === 'mensual' ? 'Mensual' : 'Personalizado' },
            { label: 'Modalidad', value: form.modality },
            { label: 'Ubicación', value: locationLabel },
            { label: 'Horarios', value: slotsLabel },
            { label: 'Precio', value: priceLabel },
            { label: 'Contacto', value: form.contactMode === 'ambos' ? 'WhatsApp + Instagram' : form.contactMode === 'instagram' ? 'Instagram' : 'WhatsApp' },
            { label: 'Cupos', value: form.maxSpots ? `${form.maxSpots} cupos` : '—' },
          ].map((row, i) => (
            <div key={row.label} className={`flex gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
              <span className="text-xs font-bold text-neutral-500 w-24 shrink-0 pt-0.5">{row.label}</span>
              <span className="text-sm text-neutral-800 break-words flex-1">{row.value}</span>
            </div>
          ))}
        </div>

        {coverImageUrl && (
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Imagen de portada</p>
            <img src={coverImageUrl} alt="Portada" className="w-full h-40 object-cover rounded-xl border border-neutral-200" />
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">💡 Consejo</p>
          <p className="text-xs text-amber-700">
            Puedes guardar como borrador y publicar después. Una vez activa, tu clase aparecerá en el buscador de Kynea.
          </p>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <SegmentedProgress step={step} />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-neutral-900">
          {classId ? 'Editar clase' : 'Crea tu clase de baile'}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {classId ? 'Modifica los campos y guarda los cambios.' : 'Completa cada paso para publicar tu clase.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 p-6 mb-6 shadow-sm">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className="flex justify-between items-center pt-2">
        {step === 0 ? (
          <Link href="/dashboard/mis-clases" className="btn-outline">Cancelar</Link>
        ) : (
          <button type="button" onClick={goBack} className="btn-outline flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button type="button" onClick={goNext} className="btn-dark flex items-center gap-2">
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex flex-col gap-3 items-end">
            {submitError && <p className="text-[13px] text-red-600 font-medium">{submitError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => handlePublish('draft')} disabled={isPending}
                className="btn-outline flex items-center gap-2 disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {classId ? 'Guardar cambios' : 'Guardar borrador'}
              </button>
              <button type="button" onClick={() => handlePublish('published')} disabled={isPending}
                className="btn-dark flex items-center gap-2 disabled:opacity-50">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {classId ? 'Guardar y publicar' : 'Publicar clase'}
                {!isPending && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
