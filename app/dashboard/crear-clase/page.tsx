'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Check, Plus, Trash2, Save,
  Upload, MapPin, Monitor, Layers,
} from 'lucide-react';
import { DANCE_STYLES, LEVELS } from '@/lib/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Información básica', emoji: '📝' },
  { label: 'Horario y ubicación', emoji: '📅' },
  { label: 'Precio y detalles', emoji: '💰' },
  { label: 'Revisión y publicación', emoji: '🚀' },
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type Slot = { days: string[]; startTime: string; endTime: string };

// ─── Pill button helper ────────────────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 border-2 text-sm font-semibold transition-all ${
        active
          ? 'bg-neutral-900 text-white border-neutral-900'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
      {children}
    </label>
  );
}

// ─── Hint text ────────────────────────────────────────────────────────────────

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-neutral-400 mt-1">{children}</p>;
}

// ─── Native select wrapper ────────────────────────────────────────────────────

function NativeSelect({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="input appearance-none cursor-pointer"
    >
      {children}
    </select>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  const progress = ((step + 1) / STEPS.length) * 100;
  return (
    <div className="mb-8">
      {/* Step circles + connecting lines */}
      <div className="flex items-center mb-4">
        {STEPS.map((s, i) => {
          const completed = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    completed
                      ? 'bg-neutral-900 text-white'
                      : active
                      ? 'bg-neutral-900 text-white'
                      : 'border-2 border-neutral-200 text-neutral-400 bg-white'
                  }`}
                >
                  {completed ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {/* Label — hidden on mobile */}
                <span
                  className={`hidden sm:block text-xs mt-1.5 font-semibold whitespace-nowrap ${
                    active ? 'text-neutral-900' : completed ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-5 sm:mb-3.5 rounded-full overflow-hidden bg-neutral-200">
                  <div
                    className="h-full bg-neutral-900 rounded-full transition-all duration-300"
                    style={{ width: i < step ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CrearClasePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
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
    footwear: '',
    clothing: '',
    prerequisites: '',
    ageGroup: '',
    toBring: [] as string[],
    status: 'draft',
  });

  const set = (k: keyof typeof form, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  // Slot helpers
  const addSlot = () =>
    setSlots(s => [...s, { days: [], startTime: '19:00', endTime: '20:30' }]);
  const removeSlot = (i: number) =>
    setSlots(s => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, key: keyof Slot, val: unknown) =>
    setSlots(s =>
      s.map((slot, idx) => (idx === i ? { ...slot, [key]: val } : slot))
    );
  const toggleSlotDay = (slotIdx: number, day: string) =>
    setSlots(s =>
      s.map((slot, idx) => {
        if (idx !== slotIdx) return slot;
        const days = slot.days.includes(day)
          ? slot.days.filter(d => d !== day)
          : [...slot.days, day];
        return { ...slot, days };
      })
    );

  const goNext = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(s => Math.max(s - 1, 0));
  };

  const handlePublish = (status: string) => {
    set('status', status);
    router.push('/dashboard/mis-clases');
  };

  // ── Step 1: Información básica ─────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-neutral-900 text-xl mb-0.5">
          📝 Información básica
        </h2>
        <p className="text-sm text-neutral-500">
          Cuéntanos sobre tu clase para que los alumnos te encuentren.
        </p>
      </div>

      {/* Type selector */}
      <div>
        <FieldLabel>Tipo de publicación</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'clase', label: 'Clase' },
            { value: 'taller', label: 'Taller' },
            { value: 'curso', label: 'Curso' },
            { value: 'masterclass', label: 'Masterclass' },
            { value: 'intensivo', label: 'Intensivo' },
          ].map(opt => (
            <Pill
              key={opt.value}
              active={form.type === opt.value}
              onClick={() => set('type', opt.value)}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <FieldLabel>Título de la clase *</FieldLabel>
        <input
          className="input"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Ej: Salsa Básico desde cero"
          maxLength={80}
        />
        <Hint>
          Un buen título atrae más alumnos. Ejemplo: &ldquo;Salsa Básico para principiantes&rdquo;
        </Hint>
      </div>

      {/* Style + Level */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Estilo de baile *</FieldLabel>
          <NativeSelect
            value={form.style}
            onChange={e => set('style', e.target.value)}
          >
            <option value="">Seleccionar estilo…</option>
            {DANCE_STYLES.map(s => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <FieldLabel>Nivel *</FieldLabel>
          <NativeSelect
            value={form.level}
            onChange={e => set('level', e.target.value)}
          >
            <option value="">Seleccionar nivel…</option>
            {LEVELS.map(l => (
              <option key={l}>{l}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Short description */}
      <div>
        <FieldLabel>
          Descripción corta{' '}
          <span className="font-normal text-neutral-400">(máx. 120 caracteres)</span>
        </FieldLabel>
        <input
          className="input"
          value={form.shortDesc}
          onChange={e => set('shortDesc', e.target.value)}
          placeholder="Aprende los fundamentos en un ambiente divertido…"
          maxLength={120}
        />
        <Hint>
          {form.shortDesc.length}/120 caracteres — se muestra en la tarjeta
        </Hint>
      </div>

      {/* Full description */}
      <div>
        <FieldLabel>Descripción completa</FieldLabel>
        <textarea
          rows={5}
          value={form.fullDesc}
          onChange={e => set('fullDesc', e.target.value)}
          placeholder="Cuéntanos todo sobre la clase: qué aprenderán, para quién es, dinámica, requisitos…"
          className="input resize-none"
        />
      </div>

      {/* Cover image */}
      <div>
        <FieldLabel>Imagen de portada</FieldLabel>
        <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-neutral-400 transition-colors cursor-pointer group">
          <Upload className="w-10 h-10 text-neutral-300 group-hover:text-neutral-400 mx-auto mb-3 transition-colors" />
          <p className="text-sm font-semibold text-neutral-600">
            Arrastra tu imagen aquí
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            PNG, JPG, WebP · Máx. 5 MB
          </p>
          <button
            type="button"
            className="mt-4 text-xs font-semibold text-neutral-900 border border-neutral-300 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Seleccionar archivo
          </button>
        </div>
        <Hint>Recomendado: 1200×630 px, formato JPG o PNG</Hint>
      </div>
    </div>
  );

  // ── Step 2: Horario y ubicación ───────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-neutral-900 text-xl mb-0.5">
          📅 Horario y ubicación
        </h2>
        <p className="text-sm text-neutral-500">
          Indica cuándo y dónde se dicta tu clase.
        </p>
      </div>

      {/* Dates */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Fecha de inicio</FieldLabel>
          <input
            type="date"
            className="input"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>
            Fecha de fin{' '}
            <span className="font-normal text-neutral-400">(opcional)</span>
          </FieldLabel>
          <input
            type="date"
            className="input"
            value={form.endDate}
            onChange={e => set('endDate', e.target.value)}
          />
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <FieldLabel>Tipo de recurrencia</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'unica', label: 'Clase única' },
            { value: 'semanal', label: 'Semanal' },
            { value: 'rango', label: 'Rango de fechas' },
            { value: 'custom', label: 'Personalizado' },
          ].map(opt => (
            <Pill
              key={opt.value}
              active={form.recurrence === opt.value}
              onClick={() => set('recurrence', opt.value)}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <FieldLabel>Horarios</FieldLabel>
          <button
            type="button"
            onClick={addSlot}
            className="flex items-center gap-1.5 text-xs text-neutral-900 font-semibold hover:bg-neutral-100 px-3 py-1.5 rounded-lg transition-colors border border-neutral-200"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar horario
          </button>
        </div>

        <div className="space-y-4">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-xl p-4 space-y-4 bg-neutral-50/50"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-neutral-700">
                  Horario {i + 1}
                </p>
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Days */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">
                  Días de la semana
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleSlotDay(i, d)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border-2 font-semibold transition-colors ${
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

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1.5">
                    Hora inicio
                  </p>
                  <input
                    type="time"
                    className="input"
                    value={slot.startTime}
                    onChange={e => updateSlot(i, 'startTime', e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1.5">
                    Hora fin
                  </p>
                  <input
                    type="time"
                    className="input"
                    value={slot.endTime}
                    onChange={e => updateSlot(i, 'endTime', e.target.value)}
                  />
                </div>
              </div>

              {slot.days.length > 0 && (
                <p className="text-xs text-neutral-600 bg-white px-3 py-2.5 rounded-lg border border-neutral-200">
                  Esta clase se dicta los{' '}
                  <span className="font-semibold">{slot.days.join(', ')}</span>{' '}
                  de {slot.startTime} a {slot.endTime}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modality */}
      <div>
        <FieldLabel>Modalidad</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'Presencial', label: 'Presencial', icon: <MapPin className="w-3.5 h-3.5" /> },
            { value: 'Online', label: 'Online', icon: <Monitor className="w-3.5 h-3.5" /> },
            { value: 'Híbrida', label: 'Híbrida', icon: <Layers className="w-3.5 h-3.5" /> },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('modality', opt.value)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 border-2 text-sm font-semibold transition-all ${
                form.modality === opt.value
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Presencial fields */}
      {form.modality !== 'Online' && (
        <div className="space-y-4 border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
          <p className="text-xs font-bold text-neutral-700">Ubicación presencial</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Ciudad</FieldLabel>
              <NativeSelect
                value={form.city}
                onChange={e => set('city', e.target.value)}
              >
                {['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <FieldLabel>Distrito</FieldLabel>
              <input
                className="input"
                value={form.district}
                onChange={e => set('district', e.target.value)}
                placeholder="Ej: Miraflores"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Dirección</FieldLabel>
            <input
              className="input"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Av. Benavides 1234, piso 3"
            />
          </div>
          <div>
            <FieldLabel>Referencia</FieldLabel>
            <input
              className="input"
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              placeholder="Frente al parque Kennedy"
            />
          </div>
        </div>
      )}

      {/* Online fields */}
      {form.modality !== 'Presencial' && (
        <div className="space-y-4 border border-neutral-200 rounded-xl p-4 bg-neutral-50/50">
          <p className="text-xs font-bold text-neutral-700">Acceso online</p>
          <div>
            <FieldLabel>Plataforma</FieldLabel>
            <NativeSelect
              value={form.platform}
              onChange={e => set('platform', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              <option>Zoom</option>
              <option>Google Meet</option>
              <option>Otra</option>
            </NativeSelect>
          </div>
          <div>
            <FieldLabel>Enlace de acceso</FieldLabel>
            <input
              className="input"
              value={form.accessLink}
              onChange={e => set('accessLink', e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
            <Hint>Puedes ocultarlo hasta confirmar la inscripción</Hint>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 3: Precio y detalles ──────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-neutral-900 text-xl mb-0.5">
          💰 Precio y detalles
        </h2>
        <p className="text-sm text-neutral-500">
          Define el costo y los requisitos para participar.
        </p>
      </div>

      {/* Price type */}
      <div>
        <FieldLabel>Tipo de precio</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {['Gratis', 'Por clase', 'Mensual', 'Paquete', 'Precio único'].map(pt => (
            <Pill
              key={pt}
              active={form.priceType === pt}
              onClick={() => set('priceType', pt)}
            >
              {pt}
            </Pill>
          ))}
        </div>
      </div>

      {/* Amount + currency */}
      {form.priceType !== 'Gratis' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Monto</FieldLabel>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-bold pointer-events-none">
                {form.currency === 'PEN' ? 'S/' : '$'}
              </span>
              <input
                type="number"
                className="input pl-10"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Moneda</FieldLabel>
            <NativeSelect
              value={form.currency}
              onChange={e => set('currency', e.target.value)}
            >
              <option value="PEN">PEN – Soles</option>
              <option value="USD">USD – Dólares</option>
            </NativeSelect>
          </div>
        </div>
      )}

      {/* Max spots */}
      <div>
        <FieldLabel>Cupos máximos</FieldLabel>
        <input
          type="number"
          className="input"
          value={form.maxSpots}
          onChange={e => set('maxSpots', e.target.value)}
          placeholder="Ej: 20"
          min={1}
        />
      </div>

      {/* Reservation mode */}
      <div>
        <FieldLabel>Modalidad de reserva</FieldLabel>
        <div className="space-y-2">
          {[
            {
              value: 'whatsapp',
              label: 'Contactar por WhatsApp',
              desc: 'Los alumnos te escriben directamente',
            },
            {
              value: 'direct',
              label: 'Inscripción directa',
              desc: 'El alumno se inscribe sin intermediarios',
            },
            {
              value: 'request',
              label: 'Solicitud de cupo',
              desc: 'Tú apruebas cada inscripción',
            },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.reservationMode === opt.value
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <input
                type="radio"
                name="reservationMode"
                value={opt.value}
                checked={form.reservationMode === opt.value}
                onChange={() => set('reservationMode', opt.value)}
                className="mt-0.5 accent-neutral-900"
              />
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {opt.label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Footwear */}
      <div>
        <FieldLabel>Calzado recomendado</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[
            'Zapatillas',
            'Tacos / heels',
            'Pies descalzos',
            'Zapatos de salsa',
            'Zapatos de ballet',
            'Otro',
          ].map(opt => (
            <Pill
              key={opt}
              active={form.footwear === opt}
              onClick={() => set('footwear', form.footwear === opt ? '' : opt)}
            >
              {opt}
            </Pill>
          ))}
        </div>
      </div>

      {/* Clothing */}
      <div>
        <FieldLabel>Ropa recomendada</FieldLabel>
        <input
          className="input"
          value={form.clothing}
          onChange={e => set('clothing', e.target.value)}
          placeholder="Ej: Ropa cómoda y transpirable"
        />
      </div>

      {/* Prerequisites */}
      <div>
        <FieldLabel>Requisitos previos</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[
            'Sin experiencia previa',
            'Conocimiento básico',
            'Experiencia previa',
            'Evaluación previa',
          ].map(opt => (
            <Pill
              key={opt}
              active={form.prerequisites === opt}
              onClick={() =>
                set('prerequisites', form.prerequisites === opt ? '' : opt)
              }
            >
              {opt}
            </Pill>
          ))}
        </div>
      </div>

      {/* Age group */}
      <div>
        <FieldLabel>Edad recomendada</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {['Niños', 'Adolescentes', 'Adultos', 'Adulto mayor', 'Todas las edades'].map(
            opt => (
              <Pill
                key={opt}
                active={form.ageGroup === opt}
                onClick={() =>
                  set('ageGroup', form.ageGroup === opt ? '' : opt)
                }
              >
                {opt}
              </Pill>
            )
          )}
        </div>
      </div>

      {/* What to bring */}
      <div>
        <FieldLabel>Qué llevar</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {['Agua', 'Toalla', 'Rodilleras', 'Mat', 'Otro'].map(opt => (
            <Pill
              key={opt}
              active={form.toBring.includes(opt)}
              onClick={() => {
                const list = form.toBring.includes(opt)
                  ? form.toBring.filter(x => x !== opt)
                  : [...form.toBring, opt];
                set('toBring', list);
              }}
            >
              {opt}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 4: Revisión y publicación ────────────────────────────────────────
  const renderStep3 = () => {
    const priceLabel =
      form.priceType === 'Gratis'
        ? 'Gratis'
        : form.price
        ? `${form.currency === 'PEN' ? 'S/' : '$'}${form.price} (${form.priceType})`
        : '—';

    const locationLabel =
      form.modality !== 'Online'
        ? [form.address, form.district, form.city].filter(Boolean).join(', ') || '—'
        : form.platform || '—';

    const slotsLabel =
      slots
        .map(s => `${s.days.join(', ')} · ${s.startTime}–${s.endTime}`)
        .join(' | ') || '—';

    const summaryRows = [
      { label: 'Tipo', value: form.type },
      { label: 'Título', value: form.title || '—' },
      { label: 'Estilo', value: form.style || '—' },
      { label: 'Nivel', value: form.level || '—' },
      { label: 'Modalidad', value: form.modality },
      { label: 'Ubicación', value: locationLabel },
      { label: 'Horarios', value: slotsLabel },
      { label: 'Precio', value: priceLabel },
      { label: 'Cupos', value: form.maxSpots ? `${form.maxSpots} cupos` : '—' },
      { label: 'Reserva', value: form.reservationMode },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-black text-neutral-900 text-xl mb-0.5">
            🚀 Revisión y publicación
          </h2>
          <p className="text-sm text-neutral-500">
            Revisa los datos antes de publicar tu clase.
          </p>
        </div>

        {/* Summary table */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          {summaryRows.map((row, i) => (
            <div
              key={row.label}
              className={`flex gap-4 px-4 py-3 ${
                i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
              }`}
            >
              <span className="text-xs font-bold text-neutral-500 w-24 shrink-0 pt-0.5">
                {row.label}
              </span>
              <span className="text-sm text-neutral-800 break-words flex-1">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Card preview */}
        <div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Así se verá tu clase
          </p>
          <div className="bg-neutral-100 rounded-2xl p-6 flex justify-center">
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden w-72 shadow-sm">
              {/* Cover */}
              <div className="h-40 bg-neutral-200 flex items-center justify-center">
                <span className="text-neutral-400 text-xs">Vista previa</span>
              </div>
              {/* Content */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs bg-pink-50 text-pink-600 border border-pink-100 px-2.5 py-1 rounded-full font-semibold">
                    {form.style || 'Estilo'}
                  </span>
                  <span className="font-bold text-neutral-900 text-sm">
                    {form.priceType === 'Gratis'
                      ? 'Gratis'
                      : form.price
                      ? `S/${form.price}`
                      : 'Precio'}
                  </span>
                </div>
                <h3 className="font-bold text-neutral-900 text-sm leading-snug">
                  {form.title || 'Nombre de la clase'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Profesor · {form.level || 'Nivel'}
                </p>
                {slots[0]?.days.length > 0 && (
                  <p className="text-xs text-neutral-400 mt-2">
                    {slots[0].days[0]} · {slots[0].startTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">💡 Consejo</p>
          <p className="text-xs text-amber-700">
            Puedes guardar como borrador y publicar después. Una vez activa,
            tu clase aparecerá en el buscador de Kynea.
          </p>
        </div>

        {/* Publish actions */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handlePublish('draft')}
            className="btn-outline flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => handlePublish('active')}
            className="btn-dark flex items-center justify-center gap-2"
          >
            Publicar clase <span>🚀</span>
          </button>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/mis-clases"
          className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-neutral-900 leading-none">
            Crear nueva clase
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Paso {step + 1} de {STEPS.length} — {STEPS[step].label}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 sm:p-7 mb-6">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Navigation — sticky on mobile */}
      {step < STEPS.length - 1 && (
        <div className="sticky bottom-0 sm:static bg-white sm:bg-transparent border-t sm:border-0 border-neutral-200 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="btn-outline flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="btn-dark flex-1 flex items-center justify-center gap-2"
          >
            Continuar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Back button on last step (publish actions are inside the card) */}
      {step === STEPS.length - 1 && (
        <div className="sticky bottom-0 sm:static bg-white sm:bg-transparent border-t sm:border-0 border-neutral-200 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0">
          <button
            type="button"
            onClick={goBack}
            className="btn-outline flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>
        </div>
      )}
    </div>
  );
}
