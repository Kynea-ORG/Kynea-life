import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockRpc = vi.fn();
// `fetchIsAdmin`/`fetchAdminCreatedUsers` only ever need `.select().eq().single()`,
// so that's the default shape here — `fetchUserCounts` below reconfigures
// this per-test (its `.select(..., {count,head:true})` chain is awaitable
// directly, not `.single()`-terminated) and restores it afterwards.
const defaultFromImpl = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: mockSingle,
    })),
  })),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return shape varies per describe block (see fetchUserCounts below)
const mockFrom = vi.fn<(table: string) => any>(defaultFromImpl);

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import {
  fetchAdminCreatedUsers,
  fetchIsAdmin,
  fetchUserCounts,
  fetchAdminProfesores,
  fetchAdminClassesSummary,
  fetchAdminBookingsSummary,
  ADMIN_PROFESORES_PAGE_SIZE,
} from './queries';

describe('fetchIsAdmin', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSingle.mockReset();
  });

  it('returns false when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    expect(await fetchIsAdmin()).toBe(false);
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('returns true when the profile row has is_admin: true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null });

    expect(await fetchIsAdmin()).toBe(true);
  });

  it('returns false when the profile row has is_admin: false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });

    expect(await fetchIsAdmin()).toBe(false);
  });

  it('returns false (fail-closed) when the query errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    expect(await fetchIsAdmin()).toBe(false);
  });
});

describe('fetchAdminCreatedUsers', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('maps rows and computes total/totalPages from total_count', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'profesor', created_at: '2026-01-01T00:00:00Z', created_by: 'admin-1', creator_name: 'Admin', total_count: 25 },
        { id: 'u2', name: null, email: 'sin-nombre@example.com', role: 'academia', created_at: '2026-01-02T00:00:00Z', created_by: 'admin-1', creator_name: null, total_count: 25 },
      ],
      error: null,
    });

    const result = await fetchAdminCreatedUsers(2);

    expect(mockRpc).toHaveBeenCalledWith('admin_list_created_users', { p_page: 2, p_page_size: 20 });
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(result.users).toEqual([
      { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'profesor', createdAt: '2026-01-01T00:00:00Z', createdBy: 'admin-1', creatorName: 'Admin' },
      { id: 'u2', name: null, email: 'sin-nombre@example.com', role: 'academia', createdAt: '2026-01-02T00:00:00Z', createdBy: 'admin-1', creatorName: null },
    ]);
  });

  it('returns an empty page with total 0 and totalPages 1 when there are zero rows', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await fetchAdminCreatedUsers(1);

    expect(result).toEqual({ users: [], total: 0, page: 1, totalPages: 1 });
  });

  it('returns an empty page (not an error) when requesting a page past the end', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await fetchAdminCreatedUsers(99);

    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(99);
  });

  it('fails closed and logs when the RPC errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await fetchAdminCreatedUsers(1);

    expect(result).toEqual({ users: [], total: 0, page: 1, totalPages: 1 });
    expect(consoleSpy).toHaveBeenCalledWith('fetchAdminCreatedUsers error:', 'boom');
    consoleSpy.mockRestore();
  });
});

describe('fetchUserCounts', () => {
  // `Promise.all` fires the 7 count queries in this fixed order (see
  // fetchUserCounts): total, alumno, profesor, academia, academiaApproved,
  // requestsPending, requestsRejected.
  // Each `.from(...).select(...)` chain is directly awaitable in the
  // real client (a PostgrestFilterBuilder), same as `.eq()`/`.not()` calls
  // on it — this stub mirrors that by making every link in the chain both
  // chainable *and* thenable, resolving to that call's queued result.
  function mockCountQueries(results: Array<{ count: number | null; error: { message: string } | null }>) {
    let call = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => {
        const result = results[call++];
        const builder = {
          eq: vi.fn(() => builder),
          not: vi.fn(() => builder),
          then: (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve),
        };
        return builder;
      }),
    }));
  }

  afterEach(() => {
    mockFrom.mockImplementation(defaultFromImpl);
  });

  it('aggregates total/role counts and counts approved, pending, and rejected academia requests', async () => {
    mockCountQueries([
      { count: 34, error: null }, // total
      { count: 1, error: null },  // alumno
      { count: 31, error: null }, // profesor
      { count: 2, error: null },  // academia
      { count: 2, error: null },  // academiaApproved
      { count: 3, error: null },  // requestsPending
      { count: 1, error: null },  // requestsRejected
    ]);

    expect(await fetchUserCounts()).toEqual({
      total: 34, alumno: 1, profesor: 31, academia: 2,
      academiaApproved: 2, academiaPending: 3, academiaRejected: 1,
    });
  });

  it('treats every missing count as 0', async () => {
    mockCountQueries([
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
    ]);

    expect(await fetchUserCounts()).toEqual({
      total: 0, alumno: 0, profesor: 0, academia: 0,
      academiaApproved: 0, academiaPending: 0, academiaRejected: 0,
    });
  });

  it('logs (but does not throw) when one of the count queries errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCountQueries([
      { count: 34, error: null },
      { count: 1, error: null },
      { count: 31, error: null },
      { count: null, error: { message: 'boom' } }, // academia
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
    ]);

    const result = await fetchUserCounts();

    expect(result.academia).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith('fetchUserCounts (academia) error:', 'boom');
    consoleSpy.mockRestore();
  });
});

describe('fetchAdminProfesores', () => {
  afterEach(() => {
    mockFrom.mockImplementation(defaultFromImpl);
  });

  // Cadena awaitable: select → eq → [ilike] → order → range
  function mockProfilesQuery(result: { data: unknown; count?: number | null; error: { code?: string; message: string } | null }) {
    const calls: { filters: [string, unknown][]; ilike?: [string, string]; range?: [number, number]; order?: string } = { filters: [] };
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn((c: string, v: unknown) => { calls.filters.push([c, v]); return builder; }),
      ilike: vi.fn((c: string, v: string) => { calls.ilike = [c, v]; return builder; }),
      order: vi.fn((c: string) => { calls.order = c; return builder; }),
      range: vi.fn((a: number, b: number) => { calls.range = [a, b]; return builder; }),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
    };
    mockFrom.mockImplementation(() => builder);
    return calls;
  }

  const ROW = { id: 'p1', name: 'Ana', slug: 'ana', photo_url: null, is_woman: true, created_at: '2026-01-01' };

  it('lista solo profesores y mapea las filas', async () => {
    const calls = mockProfilesQuery({ data: [ROW, { ...ROW, id: 'p2', name: 'Luis', is_woman: null }], count: 2, error: null });
    const res = await fetchAdminProfesores({ page: 1 });
    expect(calls.filters).toContainEqual(['role', 'profesor']);
    expect(res.total).toBe(2);
    expect(res.profesores).toEqual([
      { id: 'p1', name: 'Ana', slug: 'ana', photoUrl: null, isWoman: true },
      { id: 'p2', name: 'Luis', slug: 'ana', photoUrl: null, isWoman: false },
    ]);
  });

  it('pagina de a ADMIN_PROFESORES_PAGE_SIZE', async () => {
    const calls = mockProfilesQuery({ data: [], count: 0, error: null });
    await fetchAdminProfesores({ page: 3 });
    expect(calls.range).toEqual([2 * ADMIN_PROFESORES_PAGE_SIZE, 3 * ADMIN_PROFESORES_PAGE_SIZE - 1]);
  });

  it('filtra por nombre sin dejar que el texto rompa el patrón', async () => {
    const calls = mockProfilesQuery({ data: [], count: 0, error: null });
    await fetchAdminProfesores({ search: '  an%a_  ', page: 1 });
    expect(calls.ilike).toEqual(['name', '%ana%']);
  });

  it('si la columna no existe (migración 63 pendiente) lo indica en vez de romper', async () => {
    mockProfilesQuery({ data: null, count: null, error: { code: '42703', message: 'column profiles.is_woman does not exist' } });
    const res = await fetchAdminProfesores({ page: 1 });
    expect(res.profesores).toEqual([]);
    expect(res.migrationPending).toBe(true);
  });
});

describe('fetchAdminClassesSummary', () => {
  afterEach(() => {
    mockFrom.mockImplementation(defaultFromImpl);
  });

  function mockClassesQuery(result: { data: unknown; error: { message: string } | null }) {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => Promise.resolve(result)),
    }));
  }

  it('agrega conteos por estado, reservas, tipo, modalidad, origen, engagement y top 5', async () => {
    const now = new Date('2026-11-20T15:00:00Z'); // 2026-11-20 en Lima
    mockClassesQuery({
      data: [
        {
          id: 'c1', title: 'Bachata Sensual', slug: 'bachata-sensual', type: 'taller', modality: 'Presencial',
          status: 'published', end_date: '2026-11-30', booking_mode: 'class',
          views_count: 120, contacts_count: 15, saved_count: 10,
          external_organizer_name: null, created_by_superuser: false,
          class_styles: [{ is_main: true, dance_styles: { slug: 'bachata' } }],
        },
        {
          id: 'c2', title: 'Salsa Semanal', slug: 'salsa-semanal', type: 'clase-suelta', modality: 'Online',
          status: 'published', end_date: null, booking_mode: 'session',
          views_count: 250, contacts_count: 30, saved_count: 20,
          external_organizer_name: null, created_by_superuser: true,
          class_styles: [{ is_main: true, dance_styles: { slug: 'salsa' } }],
        },
        {
          id: 'c3', title: 'Masterclass Pasada', slug: 'mc-pasada', type: 'masterclass', modality: 'Presencial',
          status: 'published', end_date: '2026-11-10', booking_mode: 'none',
          views_count: 80, contacts_count: 5, saved_count: 4,
          external_organizer_name: 'Estudio Externo', created_by_superuser: true,
          class_styles: [],
        },
        {
          id: 'c4', title: 'Evento Borrador', slug: 'evento-b', type: 'evento', modality: 'Presencial',
          status: 'draft', end_date: '2026-12-01', booking_mode: 'class',
          views_count: 999, contacts_count: 0, saved_count: 0,
          external_organizer_name: null, created_by_superuser: false,
          class_styles: [],
        },
        {
          id: 'c5', title: 'Archivada', slug: 'arch', type: 'taller', modality: 'Online',
          status: 'archived', end_date: null, booking_mode: 'none',
          views_count: 10, contacts_count: 1, saved_count: 1,
          external_organizer_name: null, created_by_superuser: false,
          class_styles: [],
        },
      ],
      error: null,
    });

    const summary = await fetchAdminClassesSummary(now);
    expect(summary).toMatchObject({
      total: 5,
      published: 3,
      activePublished: 2,
      expiredPublished: 1,
      draft: 1,
      archived: 1,
      bookableTotal: 2,
      byClassMode: 1,
      bySessionMode: 1,
      noBookingMode: 1,
      byType: { 'clase-suelta': 1, taller: 2, masterclass: 1, evento: 1 },
      presencial: 3,
      online: 2,
      externalOrganizers: 1,
      createdBySuperuser: 2,
      totalViews: 1459,
      totalContacts: 51,
      totalSaved: 35,
    });
    expect(summary.topClasses).toEqual([
      {
        id: 'c2', title: 'Salsa Semanal', viewsCount: 250, contactsCount: 30, savedCount: 20,
        bookingMode: 'session', href: '/salsa/clase-suelta/salsa-semanal',
      },
      {
        id: 'c1', title: 'Bachata Sensual', viewsCount: 120, contactsCount: 15, savedCount: 10,
        bookingMode: 'class', href: '/bachata/taller/bachata-sensual',
      },
      {
        id: 'c3', title: 'Masterclass Pasada', viewsCount: 80, contactsCount: 5, savedCount: 4,
        bookingMode: 'none', href: null,
      },
    ]);
  });

  it('retorna defaults seguros y loguea si la consulta falla', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockClassesQuery({ data: null, error: { message: 'db down' } });

    const summary = await fetchAdminClassesSummary();
    expect(summary.total).toBe(0);
    expect(summary.topClasses).toEqual([]);
    expect(spy).toHaveBeenCalledWith('fetchAdminClassesSummary error:', 'db down');
    spy.mockRestore();
  });
});

describe('fetchAdminBookingsSummary', () => {
  afterEach(() => {
    mockFrom.mockImplementation(defaultFromImpl);
  });

  function mockBookingsQuery(result: { data: unknown; error: { message: string } | null }) {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => Promise.resolve(result)),
    }));
  }

  it('calcula confirmadas próximas, por confirmar, tasa de confirmación, canceladas/expiradas, 7 días y modalidad', async () => {
    const now = new Date('2026-11-20T15:00:00Z'); // 2026-11-20 en Lima
    mockBookingsQuery({
      data: [
        // Confirmada próxima (sesión futura)
        { status: 'confirmed', seats: 2, created_at: '2026-11-19T12:00:00Z', cancel_reason: null, class: { modality: 'Presencial', start_date: '2026-11-01', end_date: null }, session: { session_date: '2026-11-25' } },
        // Confirmada pasada (NO cuenta en próximas, SÍ cuenta en tasa histórica)
        { status: 'confirmed', seats: 1, created_at: '2026-11-10T10:00:00Z', cancel_reason: null, class: { modality: 'Presencial', start_date: '2026-11-12', end_date: '2026-11-12' }, session: null },
        // Pendiente próxima
        { status: 'pending_confirmation', seats: 3, created_at: '2026-11-19T14:00:00Z', cancel_reason: null, class: { modality: 'Online', start_date: '2026-11-26', end_date: null }, session: null },
        // Expirada (sin confirmar >48h)
        { status: 'expired', seats: 1, created_at: '2026-11-05T10:00:00Z', cancel_reason: null, class: { modality: 'Online', start_date: '2026-11-08', end_date: null }, session: null },
        // Cancelada rechazada por profesor ("Cupo liberado...")
        { status: 'cancelled', seats: 2, created_at: '2026-11-19T08:00:00Z', cancel_reason: 'Cupo liberado por el profesor (sin confirmación)', class: { modality: 'Presencial', start_date: '2026-11-24', end_date: null }, session: null },
        // Cancelada voluntaria por alumno (NO penaliza tasa de confirmación)
        { status: 'cancelled', seats: 1, created_at: '2026-11-18T08:00:00Z', cancel_reason: 'Cambio de planes', class: { modality: 'Presencial', start_date: '2026-11-28', end_date: null }, session: null },
      ],
      error: null,
    });

    const summary = await fetchAdminBookingsSummary(now);
    expect(summary).toEqual({
      totalBookings: 6,
      confirmedUpcomingCount: 1,
      confirmedUpcomingSeats: 2,
      pendingUpcomingCount: 1,
      pendingUpcomingSeats: 3,
      confirmedTotal: 2,
      cancelledCount: 2,
      expiredCount: 1,
      rejectedCount: 1,
      confirmationRate: 50, // 2 / (2 + 1 expired + 1 rejected)
      last7DaysCount: 4,
      last7DaysSeats: 8,
      presencialCount: 4,
      onlineCount: 2,
    });
  });

  it('devuelve confirmationRate en null sin registros y maneja errores sin lanzar', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBookingsQuery({ data: null, error: { message: 'bookings err' } });

    const summary = await fetchAdminBookingsSummary();
    expect(summary).toEqual({
      totalBookings: 0,
      confirmedUpcomingCount: 0,
      confirmedUpcomingSeats: 0,
      pendingUpcomingCount: 0,
      pendingUpcomingSeats: 0,
      confirmedTotal: 0,
      cancelledCount: 0,
      expiredCount: 0,
      rejectedCount: 0,
      confirmationRate: null,
      last7DaysCount: 0,
      last7DaysSeats: 0,
      presencialCount: 0,
      onlineCount: 0,
    });
    expect(spy).toHaveBeenCalledWith('fetchAdminBookingsSummary error:', 'bookings err');
    spy.mockRestore();
  });
});
