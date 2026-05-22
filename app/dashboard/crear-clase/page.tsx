'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Check, Plus, Trash2, Eye, Save, Upload, X,
} from 'lucide-react';
import { DANCE_STYLES, LEVELS } from '@/lib/mockData';

const STEPS = [
  { label: 'Info básica', emoji: '📝' },
  { label: 'Fechas y horarios', emoji: '📅' },
  { label: 'Precio y cupos', emoji: '💰' },
  { label: 'Ubicación', emoji: '📍' },
  { label: 'Multimedia', emoji: '📸' },
  { label: 'Recomendaciones', emoji: '✅' },
  { label: 'Publicación', emoji: '🚀' },
];

type Slot = { days: string[]; startTime: string; endTime: string };

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{children}</label>;
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/8 transition-all ${props.className ?? ''}`}
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 bg-white"
    >
      {children}
    </select>
  );
}

export default function CrearClasePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([{ days: [], startTime: '19:00', endTime: '20:30' }]);

  const [form, setForm] = useState({
    type: 'clase',
    title: '',
    style: '',
    level: '',
    shortDesc: '',
    fullDesc: '',
    startDate: '',
    endDate: '',
    recurrence: 'semanal',
    priceType: 'Mensual',
    price: '',
    currency: 'PEN',
    maxSpots: '',
    reservationMode: 'whatsapp',
    modality: 'Presencial',
    city: 'Lima',
    district: '',
    address: '',
    reference: '',
    mapsUrl: '',
    platform: '',
    accessLink: '',
    videoUrl: '',
    tiktokUrl: '',
    instagramUrl: '',
    footwear: '',
    clothing: '',
    prerequisites: '',
    ageGroup: '',
    toBring: [] as string[],
    status: 'draft',
  });

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addSlot = () => setSlots(s => [...s, { days: [], startTime: '19:00', endTime: '20:30' }]);
  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, key: keyof Slot, val: unknown) => {
    setSlots(s => s.map((slot, idx) => idx === i ? { ...slot, [key]: val } : slot));
  };
  const toggleSlotDay = (slotIdx: number, day: string) => {
    setSlots(s => s.map((slot, idx) => {
      if (idx !== slotIdx) return slot;
      const days = slot.days.includes(day) ? slot.days.filter(d => d !== day) : [...slot.days, day];
      return { ...slot, days };
    }));
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const handlePublish = (status: string) => {
    set('status', status);
    router.push('/dashboard/mis-clases');
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/mis-clases" className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-neutral-900">Crear nueva clase</h1>
          <p className="text-xs text-neutral-500">Paso {step + 1} de {STEPS.length}: {STEPS[step].label}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                i === step
                  ? 'bg-neutral-900 text-white'
                  : i < step
                  ? 'bg-neutral-200 text-neutral-700 cursor-pointer hover:bg-neutral-300'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {i < step ? <Check className="w-3 h-3" /> : <span>{s.emoji}</span>}
              {s.label}
            </button>
          ))}
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-neutral-900 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
        {/* Step 0: Basic info */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Información básica</h2>

            <div>
              <FieldLabel>Tipo de publicación</FieldLabel>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { value: 'clase', label: 'Clase', emoji: '🎵' },
                  { value: 'taller', label: 'Taller', emoji: '🎯' },
                  { value: 'curso', label: 'Curso', emoji: '📚' },
                  { value: 'masterclass', label: 'Masterclass', emoji: '⭐' },
                  { value: 'intensivo', label: 'Intensivo', emoji: '🔥' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set('type', opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      form.type === opt.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Título de la clase *</FieldLabel>
              <Input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ej: Salsa Básico desde cero"
              />
              <p className="text-xs text-neutral-400 mt-1">{form.title.length}/80 caracteres</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Estilo de baile *</FieldLabel>
                <Select value={form.style} onChange={e => set('style', e.target.value)}>
                  <option value="">Seleccionar estilo…</option>
                  {DANCE_STYLES.map(s => <option key={s}>{s}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Nivel *</FieldLabel>
                <Select value={form.level} onChange={e => set('level', e.target.value)}>
                  <option value="">Seleccionar nivel…</option>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel>Descripción corta <span className="font-normal text-neutral-400">(para la tarjeta, máx. 120 caracteres)</span></FieldLabel>
              <Input
                value={form.shortDesc}
                onChange={e => set('shortDesc', e.target.value)}
                placeholder="Aprende los fundamentos en un ambiente divertido…"
                maxLength={120}
              />
              <p className="text-xs text-neutral-400 mt-1">{form.shortDesc.length}/120 caracteres</p>
            </div>

            <div>
              <FieldLabel>Descripción completa</FieldLabel>
              <textarea
                rows={5}
                value={form.fullDesc}
                onChange={e => set('fullDesc', e.target.value)}
                placeholder="Cuéntanos todo sobre la clase: qué aprenderán, para quién es, dinámica, requisitos…"
                className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/8 resize-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Step 1: Schedule */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Fechas y horarios</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Fecha de inicio</FieldLabel>
                <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Fecha de fin <span className="font-normal text-neutral-400">(opcional)</span></FieldLabel>
                <Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              </div>
            </div>

            <div>
              <FieldLabel>Tipo de recurrencia</FieldLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'unica', label: 'Clase única' },
                  { value: 'semanal', label: 'Semanal' },
                  { value: 'rango', label: 'Rango de fechas' },
                  { value: 'custom', label: 'Personalizado' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set('recurrence', opt.value)}
                    className={`text-xs font-semibold py-2 px-3 rounded-xl border-2 transition-all ${
                      form.recurrence === opt.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <FieldLabel>Horarios</FieldLabel>
                <button onClick={addSlot} className="flex items-center gap-1 text-xs text-neutral-900 font-medium hover:bg-neutral-100 px-2 py-1 rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Agregar horario
                </button>
              </div>

              <div className="space-y-4">
                {slots.map((slot, i) => (
                  <div key={i} className="border border-neutral-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-neutral-600">Horario {i + 1}</p>
                      {slots.length > 1 && (
                        <button onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Días</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map(d => (
                          <button
                            key={d}
                            onClick={() => toggleSlotDay(i, d)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              slot.days.includes(d)
                                ? 'bg-neutral-900 text-white border-neutral-900'
                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                            }`}
                          >
                            {d.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Hora inicio</p>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={e => updateSlot(i, 'startTime', e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Hora fin</p>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={e => updateSlot(i, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>

                    {slot.days.length > 0 && (
                      <p className="text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
                        Esta clase se dicta los {slot.days.join(', ')} de {slot.startTime} a {slot.endTime}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Price & spots */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Precio y cupos</h2>

            <div>
              <FieldLabel>Tipo de precio</FieldLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Gratis', 'Por clase', 'Mensual', 'Paquete', 'Precio único'].map(pt => (
                  <button
                    key={pt}
                    onClick={() => set('priceType', pt)}
                    className={`text-xs font-semibold py-2.5 px-3 rounded-xl border-2 transition-all ${
                      form.priceType === pt
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {form.priceType !== 'Gratis' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Monto</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-semibold">
                      {form.currency === 'PEN' ? 'S/' : '$'}
                    </span>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={e => set('price', e.target.value)}
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Moneda</FieldLabel>
                  <Select value={form.currency} onChange={e => set('currency', e.target.value)}>
                    <option value="PEN">PEN – Soles</option>
                    <option value="USD">USD – Dólares</option>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <FieldLabel>Cupos máximos</FieldLabel>
              <Input
                type="number"
                value={form.maxSpots}
                onChange={e => set('maxSpots', e.target.value)}
                placeholder="Ej: 20"
              />
            </div>

            <div>
              <FieldLabel>Modalidad de reserva</FieldLabel>
              <div className="space-y-2">
                {[
                  { value: 'whatsapp', label: 'Contactar por WhatsApp', desc: 'Recomendado para MVP' },
                  { value: 'direct', label: 'Inscripción directa', desc: 'El alumno se inscribe sin intermediarios' },
                  { value: 'request', label: 'Solicitud de cupo', desc: 'Tú apruebas cada inscripción' },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.reservationMode === opt.value ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-900'
                  }`}>
                    <input
                      type="radio"
                      name="reservationMode"
                      value={opt.value}
                      checked={form.reservationMode === opt.value}
                      onChange={() => set('reservationMode', opt.value)}
                      className="mt-0.5 accent-neutral-900"
                    />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{opt.label}</p>
                      <p className="text-xs text-neutral-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Ubicación y modalidad</h2>

            <div>
              <FieldLabel>Modalidad</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {['Presencial', 'Online', 'Híbrida'].map(m => (
                  <button
                    key={m}
                    onClick={() => set('modality', m)}
                    className={`text-xs font-semibold py-2.5 px-3 rounded-xl border-2 transition-all ${
                      form.modality === m
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {m === 'Presencial' ? '🏢' : m === 'Online' ? '💻' : '🌐'} {m}
                  </button>
                ))}
              </div>
            </div>

            {form.modality !== 'Online' && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Ciudad</FieldLabel>
                    <Select value={form.city} onChange={e => set('city', e.target.value)}>
                      {['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'].map(c => <option key={c}>{c}</option>)}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Distrito</FieldLabel>
                    <Input value={form.district} onChange={e => set('district', e.target.value)} placeholder="Ej: Miraflores" />
                  </div>
                </div>
                <div>
                  <FieldLabel>Dirección</FieldLabel>
                  <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Av. Benavides 1234, piso 3" />
                </div>
                <div>
                  <FieldLabel>Referencia</FieldLabel>
                  <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Frente al parque Kennedy" />
                </div>
                <div>
                  <FieldLabel>Enlace de Google Maps</FieldLabel>
                  <Input value={form.mapsUrl} onChange={e => set('mapsUrl', e.target.value)} placeholder="https://maps.google.com/..." />
                </div>

                {/* Map preview placeholder */}
                <div className="rounded-xl bg-neutral-100 h-32 flex items-center justify-center text-sm text-neutral-400">
                  Vista previa del mapa aparecerá aquí
                </div>
              </>
            )}

            {form.modality !== 'Presencial' && (
              <>
                <div>
                  <FieldLabel>Plataforma</FieldLabel>
                  <Select value={form.platform} onChange={e => set('platform', e.target.value)}>
                    <option value="">Seleccionar…</option>
                    <option>Zoom</option>
                    <option>Google Meet</option>
                    <option>Otra</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Enlace de acceso</FieldLabel>
                  <Input value={form.accessLink} onChange={e => set('accessLink', e.target.value)} placeholder="https://zoom.us/j/..." />
                  <p className="text-xs text-neutral-400 mt-1">Puedes ocultarlo hasta confirmar la inscripción</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Media */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Multimedia y redes</h2>

            <div>
              <FieldLabel>Imagen de portada *</FieldLabel>
              <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-neutral-900 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-neutral-600">Arrastra tu imagen aquí</p>
                <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WebP · Máx. 5MB · Ratio recomendado 16:9</p>
                <button className="mt-4 text-xs font-semibold text-neutral-900 border border-neutral-300 px-4 py-2 rounded-lg hover:bg-neutral-50">
                  Seleccionar archivo
                </button>
              </div>
            </div>

            <div>
              <FieldLabel>Galería de imágenes <span className="font-normal text-neutral-400">(opcional)</span></FieldLabel>
              <div className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-neutral-900 transition-colors cursor-pointer">
                <p className="text-xs text-neutral-400">Arrastra o selecciona más imágenes (máx. 6)</p>
              </div>
            </div>

            <div>
              <FieldLabel>Video de la clase <span className="font-normal text-neutral-400">(URL)</span></FieldLabel>
              <Input
                value={form.videoUrl}
                onChange={e => set('videoUrl', e.target.value)}
                placeholder="YouTube, TikTok, Instagram Reel o Vimeo"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>TikTok del profesor</FieldLabel>
                <Input value={form.tiktokUrl} onChange={e => set('tiktokUrl', e.target.value)} placeholder="https://tiktok.com/@..." />
              </div>
              <div>
                <FieldLabel>Instagram del profesor</FieldLabel>
                <Input value={form.instagramUrl} onChange={e => set('instagramUrl', e.target.value)} placeholder="https://instagram.com/..." />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Requirements */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Recomendaciones y requisitos</h2>

            <div>
              <FieldLabel>Calzado recomendado</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {['Zapatillas', 'Tacos / heels', 'Pies descalzos', 'Zapatos de salsa', 'Zapatos de ballet', 'Otro'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => set('footwear', form.footwear === opt ? '' : opt)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.footwear === opt
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Ropa recomendada</FieldLabel>
              <Input value={form.clothing} onChange={e => set('clothing', e.target.value)} placeholder="Ej: Ropa cómoda y transpirable" />
            </div>

            <div>
              <FieldLabel>Requisitos previos</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {['Sin experiencia previa', 'Conocimiento básico', 'Experiencia previa', 'Evaluación previa'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => set('prerequisites', form.prerequisites === opt ? '' : opt)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.prerequisites === opt
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Edad recomendada</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {['Niños', 'Adolescentes', 'Adultos', 'Adulto mayor', 'Todas las edades'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => set('ageGroup', form.ageGroup === opt ? '' : opt)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.ageGroup === opt
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Qué llevar</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {['Agua', 'Toalla', 'Rodilleras', 'Mat', 'Otro'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      const list = form.toBring.includes(opt)
                        ? form.toBring.filter(x => x !== opt)
                        : [...form.toBring, opt];
                      set('toBring', list);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.toBring.includes(opt)
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & publish */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="font-bold text-neutral-900 text-lg">Revisión y publicación</h2>

            {/* Summary */}
            <div className="space-y-3">
              {[
                { label: 'Título', value: form.title || '—' },
                { label: 'Tipo', value: form.type },
                { label: 'Estilo', value: form.style || '—' },
                { label: 'Nivel', value: form.level || '—' },
                { label: 'Precio', value: form.priceType === 'Gratis' ? 'Gratis' : form.price ? `S/${form.price} (${form.priceType})` : '—' },
                { label: 'Cupos', value: form.maxSpots || '—' },
                { label: 'Modalidad', value: form.modality },
                {
                  label: 'Ubicación',
                  value: form.modality !== 'Online'
                    ? [form.address, form.district, form.city].filter(Boolean).join(', ') || '—'
                    : form.platform || '—',
                },
                {
                  label: 'Horarios',
                  value: slots.map(s =>
                    `${s.days.join(', ')} ${s.startTime}–${s.endTime}`
                  ).join(' | ') || '—',
                },
              ].map(row => (
                <div key={row.label} className="flex gap-3 py-2 border-b border-neutral-100 last:border-0">
                  <span className="text-xs font-semibold text-neutral-500 w-24 shrink-0">{row.label}</span>
                  <span className="text-sm text-neutral-800">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-700 font-semibold mb-1">💡 Consejo</p>
              <p className="text-xs text-amber-600">
                Puedes guardar como borrador y publicar después. Una vez activa, tu clase aparecerá en el buscador.
              </p>
            </div>

            {/* Publish actions */}
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => handlePublish('draft')}
                className="flex items-center justify-center gap-2 border-2 border-neutral-200 text-neutral-600 font-semibold py-3 rounded-btn hover:border-neutral-900 text-sm transition-colors"
              >
                <Save className="w-4 h-4" /> Guardar borrador
              </button>
              <button
                onClick={() => handlePublish('active')}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 text-neutral-700 font-semibold py-3 rounded-btn hover:bg-neutral-50 text-sm transition-colors"
              >
                <Eye className="w-4 h-4" /> Previsualizar
              </button>
              <button
                onClick={() => handlePublish('active')}
                className="flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 rounded-btn text-sm transition-colors"
              >
                Publicar clase 🚀
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 border-2 border-neutral-200 rounded-btn text-sm font-semibold text-neutral-600 hover:border-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 rounded-btn transition-colors"
          >
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
