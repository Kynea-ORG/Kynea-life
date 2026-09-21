import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

export default function ResultadosLoading() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-10">
        {/* Encabezado estático / skeleton sutil sin saltos de layout */}
        <div className="animate-pulse mb-6">
          <div className="h-8 sm:h-9 bg-neutral-200/80 rounded-xl w-64 max-w-[80%] mb-2" />
          <div className="h-4 bg-neutral-100 rounded-md w-36" />
        </div>

        {/* Banner de Búsqueda Inteligente con animación de carga activa (spinner y barra fluida superior) */}
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary-bg via-pink-50/40 to-white border border-primary/20 flex items-start gap-3.5 shadow-xs relative overflow-hidden">
          {/* Barra de progreso fluida superior */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-primary/10 overflow-hidden">
            <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
          </div>

          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Búsqueda Inteligente</span>
            </div>
            <p className="text-[15px] font-medium text-neutral-800 leading-snug">
              Buscando las mejores clases con Inteligencia Artificial…
            </p>
          </div>
        </div>

        {/* Tabs skeleton con dimensiones idénticas a ResultadosClient */}
        <div className="flex gap-1 mb-8 bg-neutral-100 rounded-xl p-1 w-fit">
          <div className="h-9 w-24 sm:w-28 bg-white rounded-lg shadow-xs" />
          <div className="h-9 w-24 sm:w-28 bg-neutral-100 rounded-lg" />
          <div className="h-9 w-24 sm:w-28 bg-neutral-100 rounded-lg" />
        </div>

        {/* Grid de tarjetas skeleton con pulso suave y unificado (sin shimmers agresivos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border border-neutral-200/80 rounded-2xl overflow-hidden bg-white flex flex-col shadow-xs"
            >
              {/* Image skeleton */}
              <div className="w-full aspect-[4/3] bg-neutral-100" />

              {/* Body skeleton */}
              <div className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 rounded-full bg-neutral-100" />
                  <div className="h-5 w-14 rounded-md bg-neutral-200/70" />
                </div>

                <div className="space-y-2">
                  <div className="h-5 bg-neutral-200/80 rounded-md w-4/5" />
                  <div className="h-4 bg-neutral-100 rounded-md w-1/2" />
                </div>

                <div className="space-y-1.5 pt-2 mt-auto border-t border-neutral-100">
                  <div className="h-3.5 bg-neutral-100 rounded-md w-3/5" />
                  <div className="h-3.5 bg-neutral-100 rounded-md w-2/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
