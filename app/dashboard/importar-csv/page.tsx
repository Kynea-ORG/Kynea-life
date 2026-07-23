'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Download, Upload, AlertCircle, CheckCircle, X, ChevronLeft, FileText } from 'lucide-react';

const CSV_COLUMNS = [
  'tipo_publicacion', 'titulo', 'estilo', 'nivel', 'descripcion_corta',
  'descripcion_completa', 'fecha_inicio', 'fecha_fin', 'dias', 'hora_inicio',
  'hora_fin', 'precio_tipo', 'precio_monto', 'moneda', 'cupos_maximos',
  'modalidad', 'ciudad', 'distrito', 'direccion', 'google_maps_url',
  'imagen_url', 'video_url', 'tiktok_url', 'calzado_recomendado',
  'requisitos', 'edad_recomendada', 'estado',
];

type RowStatus = 'ok' | 'error' | 'warning';
interface ImportRow {
  row: number;
  titulo: string;
  estilo: string;
  nivel: string;
  dias: string;
  hora_inicio: string;
  precio_monto: string;
  estado: string;
  status: RowStatus;
  errors: string[];
}

const MOCK_PREVIEW: ImportRow[] = [
  { row: 1, titulo: 'Salsa Básico', estilo: 'Salsa', nivel: 'Básico', dias: 'Lunes,Miércoles', hora_inicio: '19:00', precio_monto: '180', estado: 'active', status: 'ok', errors: [] },
  { row: 2, titulo: '', estilo: 'Bachata', nivel: 'Inicial', dias: 'Martes,Viernes', hora_inicio: '20:00', precio_monto: '150', estado: 'draft', status: 'error', errors: ['Falta el título'] },
  { row: 3, titulo: 'Hip Hop Freestyle', estilo: 'Hip Hop', nivel: 'Básico', dias: 'Sábado', hora_inicio: '25:00', precio_monto: '160', estado: 'active', status: 'error', errors: ['Formato de hora inválido (25:00)'] },
  { row: 4, titulo: 'Heels Intermedio', estilo: 'Heels', nivel: 'Intermedio', dias: 'Viernes', hora_inicio: '18:00', precio_monto: 'cien', estado: 'active', status: 'error', errors: ['Precio debe ser numérico'] },
  { row: 5, titulo: 'Ballet Clásico', estilo: 'Ballet', nivel: 'Avanzado', dias: 'Domingo', hora_inicio: '09:00', precio_monto: '200', estado: 'active', status: 'warning', errors: ['Distrito no especificado (recomendado)'] },
  { row: 6, titulo: 'Jazz Funk Mix', estilo: 'Jazz Funk', nivel: 'Intermedio', dias: 'Lunes,Miércoles,Viernes', hora_inicio: '19:30', precio_monto: '190', estado: 'draft', status: 'ok', errors: [] },
];

type ImportStep = 'upload' | 'preview' | 'success';

export default function ImportarCSVPage() {
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = MOCK_PREVIEW.filter(r => r.status === 'ok').length;
  const errorRows = MOCK_PREVIEW.filter(r => r.status === 'error').length;
  const warningRows = MOCK_PREVIEW.filter(r => r.status === 'warning').length;

  const handleFileDrop = () => {
    setFileName('mis_clases_junio_2026.csv');
    setImportStep('preview');
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Importar clases por CSV</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Sube un archivo CSV con tus clases, horarios, precios y ubicaciones</p>
        </div>
      </div>

      {/* Step: Upload */}
      {importStep === 'upload' && (
        <div key="upload" className="space-y-6 animate-fade-in">
          {/* Download template */}
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-neutral-900" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-neutral-900">¿Primera vez importando?</h3>
              <p className="text-sm text-neutral-600 mt-0.5">Descarga nuestra plantilla CSV con las columnas correctas y ejemplos incluidos</p>
            </div>
            <button className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-700 text-white font-semibold text-sm px-4 py-2.5 rounded-btn transition-colors whitespace-nowrap">
              <Download className="w-4 h-4" /> Descargar plantilla
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFileDrop(); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-[border-color,background-color] ${
              dragging ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={() => handleFileDrop()}
            />
            <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Arrastra tu archivo CSV aquí</h3>
            <p className="text-sm text-neutral-500 mb-4">o haz clic para seleccionar</p>
            <button className="text-sm font-semibold text-neutral-900 border border-neutral-200 px-6 py-2.5 rounded-btn hover:bg-neutral-100 transition-colors">
              Seleccionar archivo
            </button>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
            <h3 className="font-bold text-neutral-900 mb-4">Requisitos del archivo</h3>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Formato', value: 'CSV (UTF-8)' },
                { label: 'Máximo', value: '500 filas' },
                { label: 'Separador', value: 'Coma (,)' },
              ].map(req => (
                <div key={req.label} className="bg-neutral-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-neutral-500">{req.label}</p>
                  <p className="font-bold text-neutral-900 text-sm mt-0.5">{req.value}</p>
                </div>
              ))}
            </div>

            <h4 className="text-sm font-semibold text-neutral-700 mb-2">Columnas del archivo</h4>
            <div className="flex flex-wrap gap-1.5">
              {CSV_COLUMNS.map(col => (
                <span key={col} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full font-mono">{col}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {importStep === 'preview' && (
        <div key="preview" className="space-y-5 animate-fade-in">
          {/* File info */}
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-neutral-900 text-sm">{fileName}</p>
              <p className="text-xs text-neutral-500">{MOCK_PREVIEW.length} filas detectadas</p>
            </div>
            <button onClick={() => setImportStep('upload')} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-green-700">{validRows}</p>
              <p className="text-xs text-green-600 mt-0.5">Válidas</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-red-600">{errorRows}</p>
              <p className="text-xs text-red-500 mt-0.5">Con errores</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-yellow-700">{warningRows}</p>
              <p className="text-xs text-yellow-600 mt-0.5">Con avisos</p>
            </div>
          </div>

          {errorRows > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Se encontraron {errorRows} filas con errores</p>
                <p className="text-xs text-red-600 mt-0.5">Las filas con errores no se importarán. Corrígelas en tu archivo CSV y vuelve a subirlo.</p>
              </div>
            </div>
          )}

          {/* Data table */}
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900">Vista previa de datos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 text-left">
                    <th className="px-4 py-3 font-semibold text-neutral-500">#</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Título</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Estilo</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Nivel</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Días</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Hora</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Precio</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Estado</th>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {MOCK_PREVIEW.map(row => (
                    <tr key={row.row} className={row.status === 'error' ? 'bg-red-50/40' : row.status === 'warning' ? 'bg-yellow-50/40' : ''}>
                      <td className="px-4 py-3 text-neutral-400">{row.row}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {row.titulo || <span className="text-red-500 italic">vacío</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{row.estilo}</td>
                      <td className="px-4 py-3 text-neutral-600">{row.nivel}</td>
                      <td className="px-4 py-3 text-neutral-600">{row.dias}</td>
                      <td className={`px-4 py-3 ${row.hora_inicio === '25:00' ? 'text-red-500' : 'text-neutral-600'}`}>
                        {row.hora_inicio}
                      </td>
                      <td className={`px-4 py-3 ${isNaN(Number(row.precio_monto)) ? 'text-red-500' : 'text-neutral-600'}`}>
                        {row.precio_monto}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.estado === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {row.estado === 'active' ? 'Activa' : 'Borrador'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'ok' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {row.status === 'error' && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-red-600 text-xs">{row.errors[0]}</span>
                          </div>
                        )}
                        {row.status === 'warning' && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                            <span className="text-yellow-600 text-xs">{row.errors[0]}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setImportStep('upload')}
              className="text-sm font-medium px-5 py-3 border border-neutral-200 rounded-xl text-neutral-600 hover:border-neutral-900 transition-colors"
            >
              Volver a subir
            </button>
            <button
              onClick={() => setImportStep('success')}
              className="flex-1 text-sm font-bold py-3 border-2 border-dashed border-neutral-300 text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              Importar como borradores ({validRows + warningRows} clases)
            </button>
            <button
              onClick={() => setImportStep('success')}
              className="flex-1 text-sm font-bold py-3 bg-neutral-900 hover:bg-neutral-700 text-white rounded-btn transition-colors"
            >
              Publicar todo ({validRows} clases válidas)
            </button>
          </div>
        </div>
      )}

      {/* Step: Success */}
      {importStep === 'success' && (
        <div key="success" className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2">¡Importación exitosa!</h2>
          <p className="text-neutral-500 mb-2">Se importaron {validRows + warningRows} clases correctamente.</p>
          {errorRows > 0 && (
            <p className="text-sm text-red-500 mb-6">{errorRows} fila{errorRows !== 1 ? 's' : ''} con errores no se importó.</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              href="/dashboard/mis-clases"
              className="text-sm font-bold px-6 py-3 bg-neutral-900 hover:bg-neutral-700 text-white rounded-btn transition-colors"
            >
              Ver mis clases
            </Link>
            <button
              onClick={() => setImportStep('upload')}
              className="text-sm font-medium px-6 py-3 border border-neutral-200 rounded-xl text-neutral-600 hover:border-neutral-900 transition-colors"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
