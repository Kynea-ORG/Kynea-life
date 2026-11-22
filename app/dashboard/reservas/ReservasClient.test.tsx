// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { limaToDate } from '@/lib/bookings/dates';
import type { TeacherBooking } from '@/lib/bookings/types';

const {
  mockSetAttendance,
  mockBulkSetAttendance,
  mockCloseAttendance,
  mockCancel,
  mockCancelSession,
  mockConfirm,
} = vi.hoisted(() => ({
  mockSetAttendance: vi.fn(),
  mockBulkSetAttendance: vi.fn(),
  mockCloseAttendance: vi.fn(),
  mockCancel: vi.fn(),
  mockCancelSession: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/bookings/actions', () => ({
  setBookingAttendance: mockSetAttendance,
  bulkSetBookingAttendance: mockBulkSetAttendance,
  closeClassAttendance: mockCloseAttendance,
  cancelBooking: mockCancel,
  cancelClassSession: mockCancelSession,
  confirmBooking: mockConfirm,
}));

import ReservasClient from './ReservasClient';

function makeBooking(over: Partial<TeacherBooking> = {}): TeacherBooking {
  return {
    id: 'b1',
    classId: 'c1',
    classTitle: 'Salsa Casino',
    classModality: 'Presencial',
    sessionId: 's1',
    sessionDate: '2026-11-25',
    sessionStatus: 'open',
    startTime: '19:00',
    endTime: '20:00',
    capacity: 12,
    studentId: 'u1',
    studentName: 'Lucía Vargas',
    studentWhatsapp: '+51999111222',
    studentInstagram: 'luciavargas.pe',
    priorBookings: 0,
    priorNoShows: 0,
    seats: 1,
    status: 'confirmed',
    priceAmount: 40,
    currency: 'PEN',
    paymentMethod: 'pay_at_venue',
    createdAt: '2026-11-18T10:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  mockSetAttendance.mockResolvedValue({ ok: true });
  mockBulkSetAttendance.mockResolvedValue({ ok: true, data: { updated: 2 } });
  mockCloseAttendance.mockResolvedValue({ ok: true, data: { closed: 1 } });
  mockCancel.mockResolvedValue({ ok: true });
  mockCancelSession.mockResolvedValue({ ok: true });
  mockConfirm.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReservasClient (Opción 1 — Maestro-Detalle)', () => {
  it('en Próximas selecciona sesiones, muestra barra de cupos, ejecuta Confirmar/Liberar/Cancelar reserva/Cancelar fecha y nunca muestra "No vino"', async () => {
    const today = '2026-11-21';
    const beforeEndIso = limaToDate(today, '18:00').toISOString();
    const bookings = [
      makeBooking({
        id: 'b-p1', classId: 'c1', classTitle: 'Salsa Casino', sessionId: 's1', sessionDate: today,
        startTime: '19:00', endTime: '20:00', capacity: 12, studentName: 'Marta Pendiente',
        status: 'pending_confirmation', studentInstagram: 'martapendiente',
      }),
      makeBooking({
        id: 'b-c1', classId: 'c1', classTitle: 'Salsa Casino', sessionId: 's1', sessionDate: today,
        startTime: '19:00', endTime: '20:00', capacity: 12, studentName: 'Lucía Confirmada',
        status: 'confirmed', seats: 2,
      }),
      makeBooking({
        id: 'b-s2', classId: 'c2', classTitle: 'Bachata Sensual', sessionId: 's2', sessionDate: '2026-11-28',
        startTime: '20:00', endTime: '21:00', capacity: 10, studentName: 'Carlos Siguiente',
        status: 'confirmed',
      }),
    ];

    render(<ReservasClient bookings={bookings} today={today} nowIso={beforeEndIso} />);

    // Sin KPI cards redundantes arriba; única barra compacta en la cabecera del detalle (3/12 cupos)
    const bars = screen.getAllByRole('progressbar', { name: /ocupación de cupos/i });
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '3');
    expect(bars[0]).toHaveAttribute('aria-valuemax', '12');
    expect(bars[0].className).toContain('w-24');
    expect(screen.getAllByText('3/12 cupos').length).toBeGreaterThanOrEqual(1);

    // Sesión 1 seleccionada por defecto: pendientes arriba + confirmados abajo, sin "No vino"
    expect(screen.queryByRole('button', { name: /no vino/i })).not.toBeInTheDocument();
    expect(screen.getByText('Marta Pendiente')).toBeInTheDocument();
    expect(screen.getByText('@martapendiente')).toBeInTheDocument();
    expect(screen.getByText('Lucía Confirmada')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Siguiente')).not.toBeInTheDocument();

    // Confirmar y Liberar en solicitud pendiente
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('b-p1'));

    fireEvent.click(screen.getByRole('button', { name: /liberar cupo de marta pendiente/i }));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('b-p1', expect.any(String)));

    // "Cancelar reserva" es visible directo en la fila confirmada y al hacer clic NO abre el acordeón
    fireEvent.click(screen.getByRole('button', { name: /cancelar reserva/i }));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('b-c1', 'Cancelada por el profesor'));
    expect(screen.queryByText('Sin asistencias previas registradas contigo')).not.toBeInTheDocument();

    // Desplegar detalle del alumno confirmado -> muestra mensaje vacío + estadística literal con el profesor (sin metadata redundante)
    fireEvent.click(screen.getByRole('button', { name: /lucía confirmada/i }));
    expect(screen.getByText('Sin mensaje adicional.')).toBeInTheDocument();
    expect(screen.getByText('Sin asistencias previas registradas contigo')).toBeInTheDocument();
    expect(screen.queryByText(/primera vez contigo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/en kynea desde/i)).not.toBeInTheDocument();

    // Cancelar fecha desde la cabecera de la sesión
    fireEvent.click(screen.getByRole('button', { name: /cancelar fecha/i }));
    await waitFor(() => expect(mockCancelSession).toHaveBeenCalledWith('s1', 'Fecha cancelada por el profesor'));

    // Filtro "Por confirmar (1)" deja solo la sesión con pendientes en la lista izquierda
    const masterList = screen.getByRole('list', { name: /lista de sesiones/i });
    expect(within(masterList).getByText('Bachata Sensual')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /por confirmar \(1\)/i }));
    expect(within(masterList).queryByText('Bachata Sensual')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^todas$/i }));

    // Seleccionar sesión 2 en la lista izquierda cambia el panel derecho
    fireEvent.click(within(masterList).getByRole('button', { name: /bachata sensual/i }));
    expect(screen.getByText('Carlos Siguiente')).toBeInTheDocument();
    expect(screen.queryByText('Marta Pendiente')).not.toBeInTheDocument();
  });

  it('Opción B: cuando ya pasó endTime de una sesión de hoy, aparece directo en "Por cerrar"', () => {
    const today = '2026-11-21';
    const afterEndIso = limaToDate(today, '12:05').toISOString();
    render(
      <ReservasClient
        bookings={[makeBooking({ sessionDate: today, startTime: '10:30', endTime: '11:30' })]}
        today={today}
        nowIso={afterEndIso}
      />,
    );
    expect(screen.getByRole('tab', { name: /por cerrar/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('region', { name: /confirmados · asistencia/i })).toBeInTheDocument();
    expect(screen.getByText('Lucía Vargas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar reserva/i })).not.toBeInTheDocument();
  });

  it('en Por cerrar divide solicitudes sin confirmar de confirmados, muestra redes visibles y cierra confirmados', async () => {
    const bookings = [
      makeBooking({
        id: 'b-c1', sessionDate: '2026-11-20', status: 'confirmed', studentName: 'Ana Torres',
        studentInstagram: 'anatorres.dance', studentWhatsapp: '+51 999 111 222',
      }),
      makeBooking({
        id: 'b-ns', sessionDate: '2026-11-20', status: 'no_show', studentName: 'Luis Díaz',
        studentInstagram: undefined, studentWhatsapp: '+51 988 222 333',
      }),
      makeBooking({
        id: 'b-p', sessionDate: '2026-11-20', status: 'pending_confirmation', studentName: 'Sara Paz',
        studentInstagram: 'sarapaz_pe', studentWhatsapp: '+51 977 333 444',
      }),
    ];
    render(<ReservasClient bookings={bookings} today="2026-11-21" />);
    expect(screen.getByRole('tab', { name: /por cerrar/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: /cancelar reserva/i })).not.toBeInTheDocument();

    const pendingRegion = screen.getByRole('region', { name: /solicitudes que no llegaron a confirmar/i });
    expect(within(pendingRegion).getByText('Sara Paz')).toBeInTheDocument();
    expect(within(pendingRegion).getByText('@sarapaz_pe')).toBeInTheDocument();
    expect(within(pendingRegion).getByText('+51 977 333 444')).toBeInTheDocument();
    expect(within(pendingRegion).getByRole('button', { name: /^confirmar$/i })).toBeInTheDocument();
    expect(within(pendingRegion).getByRole('button', { name: /liberar/i })).toBeInTheDocument();

    const confirmedRegion = screen.getByRole('region', { name: /confirmados · asistencia/i });
    expect(within(confirmedRegion).getByText('Ana Torres')).toBeInTheDocument();
    expect(within(confirmedRegion).getByText('@anatorres.dance')).toBeInTheDocument();
    expect(within(confirmedRegion).getByText('Luis Díaz')).toBeInTheDocument();

    fireEvent.click(within(confirmedRegion).getByRole('button', { name: /no vino/i }));
    await waitFor(() => expect(mockSetAttendance).toHaveBeenCalledWith('b-c1', 'no_show'));

    fireEvent.click(within(confirmedRegion).getByRole('button', { name: /deshacer/i }));
    await waitFor(() => expect(mockSetAttendance).toHaveBeenCalledWith('b-ns', 'confirmed'));

    fireEvent.click(screen.getByRole('button', { name: /confirmar que los demás asistieron \(1\)/i }));
    await waitFor(() => expect(mockCloseAttendance).toHaveBeenCalledWith('c1', 's1'));
  });

  it('en Por cerrar solo renderiza la sección que tiene alumnos', () => {
    const onlyConfirmed = [
      makeBooking({ id: 'b-c1', sessionDate: '2026-11-20', status: 'confirmed', studentName: 'Ana Torres' }),
    ];
    render(<ReservasClient bookings={onlyConfirmed} today="2026-11-21" />);
    expect(screen.queryByRole('region', { name: /solicitudes que no llegaron a confirmar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /confirmados · asistencia/i })).toBeInTheDocument();
  });

  it('en Historial es solo lectura por defecto y al activar "Corregir asistencia" habilita checkboxes masivos y botones individuales', async () => {
    const bookings = [
      makeBooking({ id: 'b-h1', sessionDate: '2026-11-15', status: 'attended', studentName: 'Elena Ruiz', note: 'Llegó puntual' }),
      makeBooking({ id: 'b-h2', sessionDate: '2026-11-15', status: 'no_show', studentName: 'Diego Soto' }),
      makeBooking({ id: 'b-h3', sessionDate: '2026-11-15', status: 'cancelled', studentName: 'Sofía Cancelada' }),
    ];
    render(<ReservasClient bookings={bookings} today="2026-11-21" />);
    fireEvent.click(screen.getByRole('tab', { name: /historial/i }));

    // Por defecto: modo lectura limpio (sin botones de acción ni checkboxes)
    expect(screen.queryByRole('button', { name: /cancelar reserva/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /no vino/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deshacer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Asistió')).toBeInTheDocument();
    expect(screen.getByText('No asistió')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();

    // Activar modo "Corregir asistencia"
    fireEvent.click(screen.getByRole('button', { name: /corregir asistencia/i }));
    expect(screen.getByRole('button', { name: /^cancelar$/i })).toBeInTheDocument();

    // Checkboxes solo en filas editables (Elena y Diego), nunca en cancelada (Sofía)
    const elenaCheckbox = screen.getByRole('checkbox', { name: /seleccionar a elena ruiz/i });
    expect(screen.getByRole('checkbox', { name: /seleccionar a diego soto/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /seleccionar a sofía cancelada/i })).not.toBeInTheDocument();

    // Marcar checkbox no abre el acordeón y muestra barra de acciones masivas
    fireEvent.click(elenaCheckbox);
    expect(screen.queryByText('Llegó puntual')).not.toBeInTheDocument();
    expect(screen.getByText('1 seleccionada')).toBeInTheDocument();

    // "Seleccionar todos" marca todas las editables (2) y dispara corrección masiva
    fireEvent.click(screen.getByRole('checkbox', { name: /seleccionar todos \(2\)/i }));
    expect(screen.getByText('2 seleccionadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /marcar no asistieron/i }));
    await waitFor(() => expect(mockBulkSetAttendance).toHaveBeenCalledWith(['b-h1', 'b-h2'], 'no_show'));

    // También permite seleccionar y marcar asistieron en bloque
    fireEvent.click(screen.getByRole('checkbox', { name: /seleccionar a diego soto/i }));
    fireEvent.click(screen.getByRole('button', { name: /marcar asistieron/i }));
    await waitFor(() => expect(mockBulkSetAttendance).toHaveBeenCalledWith(['b-h2'], 'attended'));

    // Botones individuales también disponibles durante la edición
    fireEvent.click(screen.getByRole('button', { name: /no vino/i }));
    await waitFor(() => expect(mockSetAttendance).toHaveBeenCalledWith('b-h1', 'no_show'));
    fireEvent.click(screen.getByRole('button', { name: /deshacer/i }));
    await waitFor(() => expect(mockSetAttendance).toHaveBeenCalledWith('b-h2', 'attended'));

    // Salir con "Cancelar" vuelve a solo lectura
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /no vino/i })).not.toBeInTheDocument();
  });

  it('actualiza el reloj en vivo (intervalo de 60s y visibilitychange) sin recargar la página', () => {
    vi.useFakeTimers();
    const today = '2026-11-21';
    const startClock = limaToDate(today, '19:59');
    vi.setSystemTime(startClock);

    render(
      <ReservasClient
        bookings={[
          makeBooking({
            id: 'b-live',
            sessionDate: today,
            startTime: '19:00',
            endTime: '20:00',
            status: 'confirmed',
            studentName: 'Alumno En Vivo',
          }),
        ]}
        today={today}
        nowIso={startClock.toISOString()}
      />,
    );

    // 19:59 -> aún en Próximas (Por cerrar = 0)
    expect(screen.getByRole('tab', { name: /próximas/i })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /por cerrar/i })).not.toHaveTextContent('1');

    // Avanza 60s hasta 20:00 -> la clase pasa sola a Por cerrar sin recargar
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('tab', { name: /por cerrar/i })).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('tab', { name: /por cerrar/i }));
    expect(screen.getByText('Se cierra en 2 d')).toBeInTheDocument();

    // 6 horas después al volver visible la pestaña -> el contador se actualiza inmediatamente
    vi.setSystemTime(limaToDate('2026-11-22', '02:00'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('Se cierra en 1 d 18 h')).toBeInTheDocument();
  });

  it('en filas de alumnos: clic en toda la fila abre/cierra acordeón, oculta texto de nota mostrando solo ícono, muestra monto con moneda y los botones/enlaces no disparan el acordeón', async () => {
    const today = '2026-11-21';
    const beforeEndIso = limaToDate(today, '18:00').toISOString();
    const bookings = [
      makeBooking({
        id: 'b-p1',
        sessionDate: today,
        startTime: '19:00',
        endTime: '20:00',
        studentName: 'Marta Pendiente',
        studentInstagram: 'martapendiente',
        status: 'pending_confirmation',
        priceAmount: 70,
        currency: 'PEN',
        note: '¿Necesito llevar zapatos especiales?',
      }),
      makeBooking({
        id: 'b-free',
        sessionDate: today,
        startTime: '19:00',
        endTime: '20:00',
        studentName: 'Diego Gratis',
        status: 'confirmed',
        priceAmount: 0,
        paymentMethod: 'free',
      }),
    ];

    render(<ReservasClient bookings={bookings} today={today} nowIso={beforeEndIso} />);

    // Monto con moneda y "Gratis" visibles en las filas
    expect(screen.getByText('PEN 70')).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();

    // Con la fila colapsada: NO aparece el texto del mensaje, solo el ícono con aria-label/title
    expect(screen.queryByText('¿Necesito llevar zapatos especiales?')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tiene mensaje del alumno')).toBeInTheDocument();

    // Clic en el enlace @instagram NO abre el acordeón
    fireEvent.click(screen.getByRole('link', { name: '@martapendiente' }));
    expect(screen.queryByText('¿Necesito llevar zapatos especiales?')).not.toBeInTheDocument();

    // Clic en botón Confirmar ejecuta acción SIN abrir el acordeón
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('b-p1'));
    expect(screen.queryByText('¿Necesito llevar zapatos especiales?')).not.toBeInTheDocument();

    // Clic en cualquier parte de la fila (ej. sobre "PEN 70") abre el acordeón y muestra el mensaje completo sin duplicar monto ni fecha de ingreso
    fireEvent.click(screen.getByText('PEN 70'));
    expect(screen.getByText('¿Necesito llevar zapatos especiales?')).toBeInTheDocument();
    expect(screen.getAllByText(/PEN 70/)).toHaveLength(1);
    expect(screen.queryByText(/en kynea desde/i)).not.toBeInTheDocument();

    // Otro clic en la fila lo vuelve a cerrar
    fireEvent.click(screen.getByText('PEN 70'));
    expect(screen.queryByText('¿Necesito llevar zapatos especiales?')).not.toBeInTheDocument();
  });

  it('en el acordeón muestra estadísticas literales acotadas al profesor/academia (asistencias e inasistencias)', () => {
    const today = '2026-11-21';
    const beforeEndIso = limaToDate(today, '18:00').toISOString();
    const bookings = [
      makeBooking({ id: 'b-1', sessionDate: today, startTime: '19:00', endTime: '20:00', studentName: 'Ana Cero', priorBookings: 0, priorNoShows: 0 }),
      makeBooking({ id: 'b-2', sessionDate: today, startTime: '19:00', endTime: '20:00', studentName: 'Bruno Asiste', priorBookings: 3, priorNoShows: 0 }),
      makeBooking({ id: 'b-3', sessionDate: today, startTime: '19:00', endTime: '20:00', studentName: 'Carla Mixta', priorBookings: 2, priorNoShows: 1 }),
      makeBooking({ id: 'b-4', sessionDate: today, startTime: '19:00', endTime: '20:00', studentName: 'Diego Falta', priorBookings: 0, priorNoShows: 1 }),
    ];

    render(<ReservasClient bookings={bookings} today={today} nowIso={beforeEndIso} />);

    fireEvent.click(screen.getByRole('button', { name: /ana cero/i }));
    expect(screen.getByText('Sin asistencias previas registradas contigo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /bruno asiste/i }));
    expect(screen.getByText('Historial contigo: 3 asistencias previas')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /carla mixta/i }));
    expect(screen.getByText('Historial contigo: 2 asistencias · 1 inasistencia')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /diego falta/i }));
    expect(screen.getByText('Historial contigo: 0 asistencias · 1 inasistencia')).toBeInTheDocument();
  });

  it('sin reservas muestra el estado vacío limpio', () => {
    render(<ReservasClient bookings={[]} today="2026-11-21" />);
    expect(screen.getByText(/todavía no tienes reservas recibidas/i)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('en Por cerrar ordena las sesiones de más antigua a más reciente y muestra el tiempo restante una sola vez por clase', () => {
    const today = '2026-11-21';
    const now = limaToDate(today, '20:00');
    const bookings = [
      makeBooking({
        id: 'b-recent', classId: 'c1', classTitle: 'Salsa Cubana', sessionId: 's-recent',
        sessionDate: today, startTime: '13:00', endTime: '14:00', status: 'confirmed', studentName: 'Camila',
      }),
      makeBooking({
        id: 'b-mid', classId: 'c2', classTitle: 'Heels Noche', sessionId: 's-mid',
        sessionDate: '2026-11-20', startTime: '13:00', endTime: '14:00', status: 'confirmed', studentName: 'Fernanda',
      }),
      makeBooking({
        id: 'b-old-1', classId: 'c3', classTitle: 'Afro Groove', sessionId: 's-old',
        sessionDate: '2026-11-19', startTime: '22:00', endTime: '23:00', status: 'pending_confirmation', studentName: 'Diego',
      }),
      makeBooking({
        id: 'b-old-2', classId: 'c3', classTitle: 'Afro Groove', sessionId: 's-old',
        sessionDate: '2026-11-19', startTime: '22:00', endTime: '23:00', status: 'pending_confirmation', studentName: 'Renata',
      }),
    ];

    render(<ReservasClient bookings={bookings} today={today} nowIso={now.toISOString()} />);
    expect(screen.getByRole('tab', { name: /por cerrar/i })).toHaveAttribute('aria-selected', 'true');

    const toCloseList = screen.getByRole('list', { name: /lista de sesiones/i });
    const buttons = within(toCloseList).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent(/afro groove/i);
    expect(buttons[0]).toHaveTextContent('3 h');
    expect(buttons[1]).toHaveTextContent(/heels noche/i);
    expect(buttons[1]).toHaveTextContent('18 h');
    expect(buttons[2]).toHaveTextContent(/salsa cubana/i);
    expect(buttons[2]).toHaveTextContent('1 d 18 h');

    // El contador aparece solo una vez en la cabecera de la clase seleccionada (no por alumno)
    expect(screen.getAllByText('Se cierra en 3 h')).toHaveLength(1);

    fireEvent.click(buttons[2]);
    expect(screen.getAllByText('Se cierra en 1 d 18 h')).toHaveLength(1);
  });
});
