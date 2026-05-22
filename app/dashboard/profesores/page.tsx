'use client';
import { useState } from 'react';
import { Plus, Edit2, Star, BookOpen, Users, Activity, UserX, Upload, X, Download, Search, ChevronDown } from 'lucide-react';

/* ── Mock data ─────────────────────────────────────────────────────────── */

type TeacherEstado = 'activo' | 'inactivo';

interface AcademyTeacher {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  estilos: string[];
  bio: string;
  foto: string;
  estado: TeacherEstado;
  clases: number;
  rating: number;
}

const MOCK_ACADEMY_TEACHERS: AcademyTeacher[] = [
  {
    id: 't1',
    nombre: 'Carlos Mendoza',
    apellido: 'García',
    email: 'carlos@ritmolatino.pe',
    telefono: '+51 999 111 222',
    estilos: ['Salsa', 'Bachata'],
    bio: 'Profesor con 8 años de experiencia en salsa cubana y bachata sensual.',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    estado: 'activo',
    clases: 12,
    rating: 4.8,
  },
  {
    id: 't2',
    nombre: 'Valentina',
    apellido: 'Ríos',
    email: 'vale@ritmolatino.pe',
    telefono: '+51 999 333 444',
    estilos: ['Heels', 'Jazz Funk'],
    bio: 'Especialista en heels y danza sensual femenina.',
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
    estado: 'activo',
    clases: 8,
    rating: 4.9,
  },
  {
    id: 't3',
    nombre: 'Diego',
    apellido: 'Paredes',
    email: 'diego@ritmolatino.pe',
    telefono: '+51 999 555 666',
    estilos: ['Hip Hop', 'Breakdance'],
    bio: 'Freestyler urbano con experiencia en competencias nacionales.',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    estado: 'inactivo',
    clases: 5,
    rating: 4.6,
  },
];

const ALL_ESTILOS = ['Salsa', 'Bachata', 'Heels', 'Jazz Funk', 'Hip Hop', 'Breakdance'];

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  bio: '',
  foto: '',
  estilos: [] as string[],
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function ProfesoresPage() {
  const [teachers, setTeachers] = useState<AcademyTeacher[]>(MOCK_ACADEMY_TEACHERS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEstilo, setFilterEstilo] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  /* helpers */
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleStatus = (id: string) => {
    setTeachers(prev =>
      prev.map(t =>
        t.id === id ? { ...t, estado: t.estado === 'activo' ? 'inactivo' : 'activo' } : t,
      ),
    );
    showToast('Estado actualizado', 'success');
  };

  const toggleFormEstilo = (estilo: string) => {
    setForm(prev => ({
      ...prev,
      estilos: prev.estilos.includes(estilo)
        ? prev.estilos.filter(e => e !== estilo)
        : [...prev.estilos, estilo],
    }));
  };

  const handleAddTeacher = () => {
    if (!form.nombre || !form.apellido || !form.email) {
      showToast('Nombre, apellido y email son requeridos', 'error');
      return;
    }
    const newTeacher: AcademyTeacher = {
      id: `t${Date.now()}`,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      telefono: form.telefono,
      bio: form.bio,
      foto: form.foto || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
      estilos: form.estilos,
      estado: 'activo',
      clases: 0,
      rating: 0,
    };
    setTeachers(prev => [...prev, newTeacher]);
    setForm(EMPTY_FORM);
    setShowModal(false);
    showToast('Profesor agregado correctamente', 'success');
  };

  /* derived */
  const filtered = teachers.filter(t => {
    const matchSearch =
      search === '' ||
      `${t.nombre} ${t.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'activo' && t.estado === 'activo') ||
      (filterStatus === 'inactivo' && t.estado === 'inactivo');
    const matchEstilo =
      filterEstilo === 'all' || t.estilos.includes(filterEstilo);
    return matchSearch && matchStatus && matchEstilo;
  });

  const totalActivos = teachers.filter(t => t.estado === 'activo').length;
  const totalInactivos = teachers.filter(t => t.estado === 'inactivo').length;
  const totalClases = teachers.reduce((acc, t) => acc + t.clases, 0);

  /* ── render ── */
  return (
    <div className="p-6 lg:p-8 w-full max-w-6xl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.type === 'success' ? 'bg-green-bg text-green-text border border-green-dark/20' :
          toast.type === 'error'   ? 'bg-red-bg text-red-border border border-red-100' :
          'bg-blue-pastel-bg text-blue-700 border border-blue-pastel'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-snug">Profesores</h1>
          <p className="text-neutral-500 text-sm mt-1">{teachers.length} profesores en tu academia</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowCSV(true)}
            className="btn-outline btn-sm flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-dark btn-sm flex items-center gap-2 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" /> Agregar profesor
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Total profesores', value: teachers.length, icon: Users,    bg: 'bg-neutral-50',  text: 'text-neutral-700', iconBg: 'bg-neutral-200' },
          { label: 'Activos',          value: totalActivos,    icon: Activity,  bg: 'bg-green-bg',    text: 'text-green-text',  iconBg: 'bg-green-bg' },
          { label: 'Inactivos',        value: totalInactivos,  icon: UserX,     bg: 'bg-neutral-50',  text: 'text-neutral-500', iconBg: 'bg-neutral-200' },
          { label: 'Clases activas',   value: totalClases,     icon: BookOpen,  bg: 'bg-pink-50',     text: 'text-pink-600',    iconBg: 'bg-pink-100' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-5 border border-neutral-200`}>
              <div className={`w-9 h-9 ${stat.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${stat.text}`} />
              </div>
              <p className={`text-[24px] font-black ${stat.text}`}>{stat.value}</p>
              <p className="text-[13px] font-medium text-neutral-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input pr-9 appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterEstilo}
            onChange={e => setFilterEstilo(e.target.value)}
            className="input pr-9 appearance-none cursor-pointer"
          >
            <option value="all">Todos los estilos</option>
            {ALL_ESTILOS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>
      </div>

      {/* Teacher cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No se encontraron profesores</p>
          <p className="text-sm mt-1">Prueba con otro filtro o agrega un nuevo profesor</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(teacher => (
            <div key={teacher.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
              {/* Photo */}
              <img
                src={teacher.foto}
                alt={`${teacher.nombre} ${teacher.apellido}`}
                className="w-full h-40 object-cover"
              />

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-neutral-900 text-[15px] leading-tight">
                      {teacher.nombre} {teacher.apellido}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">{teacher.email}</p>
                  </div>
                  {/* Status badge */}
                  {teacher.estado === 'activo' ? (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-green-bg text-green-text whitespace-nowrap shrink-0">
                      Activo
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 whitespace-nowrap shrink-0">
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Style chips */}
                <div className="flex flex-wrap gap-1.5">
                  {teacher.estilos.map(estilo => (
                    <span key={estilo} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                      {estilo}
                    </span>
                  ))}
                </div>

                {/* Rating + clases */}
                <div className="flex items-center gap-4 text-[13px] text-neutral-500">
                  {teacher.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-dark fill-yellow-dark" />
                      {teacher.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {teacher.clases} clase{teacher.clases !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Bio */}
                {teacher.bio && (
                  <p className="text-xs text-neutral-500 line-clamp-2">{teacher.bio}</p>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center gap-2">
                <button className="btn-outline btn-sm flex-1">
                  Ver clases
                </button>
                <button
                  className="p-2 rounded-btn border-2 border-neutral-200 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleStatus(teacher.id)}
                  className={`btn-sm px-3 py-2 rounded-btn border-2 font-semibold text-[13px] transition-colors whitespace-nowrap ${
                    teacher.estado === 'activo'
                      ? 'border-neutral-200 text-neutral-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50'
                      : 'border-green-dark/30 text-green-text hover:bg-green-bg'
                  }`}
                >
                  {teacher.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add professor modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
          <div className="max-w-lg mx-4 sm:mx-auto mt-10 sm:mt-20 mb-10 bg-white rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-neutral-900">Agregar profesor</h2>
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    placeholder="Carlos"
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 mb-1 block">Apellido *</label>
                  <input
                    type="text"
                    placeholder="García"
                    value={form.apellido}
                    onChange={e => setForm(prev => ({ ...prev, apellido: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Email *</label>
                <input
                  type="email"
                  placeholder="profesor@academia.pe"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Teléfono</label>
                <input
                  type="text"
                  placeholder="+51 999 000 000"
                  value={form.telefono}
                  onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Foto (URL)</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={form.foto}
                  onChange={e => setForm(prev => ({ ...prev, foto: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-2 block">Estilos de baile</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_ESTILOS.map(estilo => (
                    <button
                      key={estilo}
                      type="button"
                      onClick={() => toggleFormEstilo(estilo)}
                      className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        form.estilos.includes(estilo)
                          ? 'bg-pink-50 text-pink-600 border-pink-200'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {estilo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Bio</label>
                <textarea
                  placeholder="Breve descripción del profesor…"
                  rows={3}
                  value={form.bio}
                  onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="input resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                className="btn-outline flex-1"
              >
                Cancelar
              </button>
              <button onClick={handleAddTeacher} className="btn-dark flex-1">
                Agregar profesor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV import modal ─────────────────────────────────────────────────── */}
      {showCSV && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
          <div className="max-w-lg mx-4 sm:mx-auto mt-10 sm:mt-20 mb-10 bg-white rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-neutral-900">Importar profesores desde CSV</h2>
              <button
                onClick={() => setShowCSV(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Download template */}
            <button className="w-full flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-100 rounded-xl mb-5 hover:bg-neutral-100 transition-colors text-left">
              <div className="w-10 h-10 bg-neutral-200 rounded-lg flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-neutral-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">Descargar plantilla CSV</p>
                <p className="text-xs text-neutral-500">Incluye columnas y ejemplos</p>
              </div>
            </button>

            {/* Drop zone */}
            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-10 text-center hover:border-neutral-900 hover:bg-neutral-50 transition-all cursor-pointer mb-5">
              <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-neutral-400" />
              </div>
              <p className="font-bold text-neutral-900 text-sm mb-1">Arrastra tu archivo CSV aquí</p>
              <p className="text-xs text-neutral-500">o haz clic para seleccionar</p>
            </div>

            {/* Required columns */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-neutral-700 mb-2">Columnas requeridas</p>
              <div className="flex flex-wrap gap-1.5">
                {['nombre', 'apellido', 'email', 'telefono', 'estilos', 'bio', 'foto_url', 'estado'].map(col => (
                  <span key={col} className="text-xs bg-white border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCSV(false)} className="btn-outline flex-1">
                Cancelar
              </button>
              <button
                onClick={() => { setShowCSV(false); showToast('Función de importación próximamente', 'info'); }}
                className="btn-dark flex-1"
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
