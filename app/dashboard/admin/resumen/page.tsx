import Link from 'next/link';
import {
  fetchAdminBookingsSummary,
  fetchAdminClassesSummary,
  fetchUserCounts,
} from '@/lib/admin/queries';
import type { BookingMode } from '@/lib/bookings/types';

export const dynamic = 'force-dynamic';

function StatCard({
  label,
  value,
  subtitle,
  big = false,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  big?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-6 shadow-sm ${big ? 'border-primary' : 'border-neutral-900'}`}>
      <p className={`font-black text-neutral-900 ${big ? 'text-4xl' : 'text-3xl'}`}>{value}</p>
      <p className="text-sm font-semibold text-neutral-700 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}

const BOOKING_MODE_LABEL: Record<BookingMode, string> = {
  none: 'Solo contacto',
  class: 'Por clase',
  session: 'Por fecha',
};

export default async function AdminResumenPage() {
  const [counts, bookings, classes] = await Promise.all([
    fetchUserCounts(),
    fetchAdminBookingsSummary(),
    fetchAdminClassesSummary(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-6xl">
      <div>
        <h1 className="text-2xl font-black text-neutral-900">Resumen</h1>
        <p className="text-neutral-600 text-sm mt-1">
          Métricas generales de reservas, clases y usuarios en Kynea
        </p>
      </div>

      {/* ── 1. RESERVAS ────────────────────────────────────────────────────── */}
      <section aria-labelledby="admin-resumen-reservas" className="space-y-4">
        <div>
          <h2 id="admin-resumen-reservas" className="text-lg font-black text-neutral-900">
            Reservas
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Actividad de reservas confirmadas, solicitudes por confirmar y modalidad
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Reservas confirmadas"
            value={bookings.confirmedTotal}
            subtitle={`${bookings.confirmedUpcomingCount} próxima${bookings.confirmedUpcomingCount !== 1 ? 's' : ''} vigente${bookings.confirmedUpcomingCount !== 1 ? 's' : ''} · ${bookings.confirmedUpcomingSeats} cupo${bookings.confirmedUpcomingSeats !== 1 ? 's' : ''} asegurado${bookings.confirmedUpcomingSeats !== 1 ? 's' : ''}`}
            big
          />
          <StatCard
            label="Por confirmar"
            value={bookings.pendingUpcomingCount}
            subtitle={
              bookings.confirmationRate !== null
                ? `${bookings.pendingUpcomingSeats} cupo${bookings.pendingUpcomingSeats !== 1 ? 's' : ''} · ${bookings.confirmationRate}% tasa de confirmación`
                : `${bookings.pendingUpcomingSeats} cupo${bookings.pendingUpcomingSeats !== 1 ? 's' : ''} esperando aprobación`
            }
          />
          <StatCard
            label="Canceladas / Expiradas"
            value={bookings.cancelledCount + bookings.expiredCount}
            subtitle={`${bookings.cancelledCount} canceladas · ${bookings.expiredCount} expiradas (de ${bookings.totalBookings})`}
          />
          <StatCard
            label="Últimos 7 días"
            value={bookings.last7DaysCount}
            subtitle={`${bookings.last7DaysSeats} cupo${bookings.last7DaysSeats !== 1 ? 's' : ''} solicitado${bookings.last7DaysSeats !== 1 ? 's' : ''}`}
          />
        </div>

        <div className="bg-white card-dash p-6">
          <p className="text-sm font-bold text-neutral-900 mb-4">Por modalidad</p>
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <p className="text-xl font-black text-neutral-900">{bookings.presencialCount}</p>
              <p className="text-xs text-neutral-600 mt-0.5">Presenciales</p>
            </div>
            <div>
              <p className="text-xl font-black text-neutral-900">{bookings.onlineCount}</p>
              <p className="text-xs text-neutral-600 mt-0.5">Online</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. CLASES EN LA PLATAFORMA ─────────────────────────────────────── */}
      <section aria-labelledby="admin-resumen-clases" className="space-y-4">
        <div>
          <h2 id="admin-resumen-clases" className="text-lg font-black text-neutral-900">
            Clases en la plataforma
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Inventario publicado, adopción de reservas, origen y rendimiento del catálogo
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Clases totales" value={classes.total} big />
          <StatCard
            label="Publicadas"
            value={classes.published}
            subtitle={`${classes.activePublished} vigentes · ${classes.expiredPublished} finalizadas`}
          />
          <StatCard
            label="Aceptan reservas"
            value={classes.bookableTotal}
            subtitle={`${classes.byClassMode} por clase · ${classes.bySessionMode} por fecha`}
          />
          <StatCard
            label="Borradores / Archivadas"
            value={`${classes.draft} / ${classes.archived}`}
            subtitle={`${classes.noBookingMode} publicadas solo contacto`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white card-dash p-5">
            <p className="text-sm font-bold text-neutral-900 mb-3">Por tipo</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.byType['clase-suelta']}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Clase suelta</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.byType.taller}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Taller</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.byType.masterclass}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Masterclass</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.byType.evento}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Evento</p>
              </div>
            </div>
          </div>

          <div className="bg-white card-dash p-5">
            <p className="text-sm font-bold text-neutral-900 mb-3">Modalidad y origen</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.presencial}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Presenciales</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.online}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Online</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.externalOrganizers}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Externas</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.createdBySuperuser}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Superusuario</p>
              </div>
            </div>
          </div>

          <div className="bg-white card-dash p-5">
            <p className="text-sm font-bold text-neutral-900 mb-3">Engagement acumulado</p>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.totalViews}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Vistas</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.totalContacts}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Contactos</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{classes.totalSaved}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Guardados</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white card-dash p-5">
          <p className="text-sm font-bold text-neutral-900 mb-3">Top 5 clases más vistas</p>
          {classes.topClasses.length === 0 ? (
            <p className="text-sm text-neutral-500">Todavía no hay clases publicadas.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {classes.topClasses.map((cls, idx) => (
                <li key={cls.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2.5 flex-1">
                    <span className="text-xs font-black text-neutral-400 w-4 shrink-0">{idx + 1}.</span>
                    {cls.href ? (
                      <Link
                        href={cls.href}
                        className="text-sm font-bold text-neutral-900 hover:text-primary truncate transition-colors"
                      >
                        {cls.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-neutral-900 truncate">{cls.title}</span>
                    )}
                    <span className="text-[11px] font-semibold bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">
                      {BOOKING_MODE_LABEL[cls.bookingMode]}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-neutral-600 whitespace-nowrap">
                    {cls.viewsCount} vistas · {cls.contactsCount} contactos · {cls.savedCount} guardados
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── 3. USUARIOS Y ACADEMIAS ────────────────────────────────────────── */}
      <section aria-labelledby="admin-resumen-usuarios" className="space-y-4">
        <div>
          <h2 id="admin-resumen-usuarios" className="text-lg font-black text-neutral-900">
            Usuarios y Academias
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">Usuarios registrados en la plataforma</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Usuarios totales" value={counts.total} big />
          <StatCard label="Alumnos" value={counts.alumno} />
          <StatCard label="Profesores" value={counts.profesor} />
          <StatCard label="Academias" value={counts.academia} />
        </div>

        {(counts.academia > 0 || counts.academiaPending > 0 || counts.academiaRejected > 0) && (
          <div className="bg-white card-dash p-6">
            <p className="text-sm font-bold text-neutral-900 mb-4">Academias por estado</p>
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-xl font-black text-neutral-900">{counts.academiaApproved}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Aprobadas</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{counts.academiaPending}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Pendientes de revisión</p>
              </div>
              <div>
                <p className="text-xl font-black text-neutral-900">{counts.academiaRejected}</p>
                <p className="text-xs text-neutral-600 mt-0.5">Rechazadas</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
