import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetUser, mockFetchIsAdmin, mockCreateUser, mockCreateAdminClient } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFetchIsAdmin: vi.fn(),
  mockCreateUser: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('@/lib/admin/queries', () => ({
  fetchIsAdmin: mockFetchIsAdmin,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}));

import { createUserAsAdmin } from './actions';
import { getCreateUserErrorMessage } from './errorMessages';

const ADMIN_USER = { id: 'admin-1' };

describe('getCreateUserErrorMessage', () => {
  it('maps duplicate/already-registered/already-exists messages to the Spanish duplicate message', () => {
    expect(getCreateUserErrorMessage('User already registered')).toBe('Ya existe una cuenta con este correo.');
    expect(getCreateUserErrorMessage('Email already exists')).toBe('Ya existe una cuenta con este correo.');
    expect(getCreateUserErrorMessage('duplicate key value')).toBe('Ya existe una cuenta con este correo.');
    expect(getCreateUserErrorMessage('has already been registered')).toBe('Ya existe una cuenta con este correo.');
  });

  it('maps password-related messages to the weak-password message', () => {
    expect(getCreateUserErrorMessage('Password should be at least 6 characters')).toBe(
      'La contraseña no cumple los requisitos mínimos (8 caracteres).'
    );
  });

  it('maps email format errors to the invalid-email message', () => {
    expect(getCreateUserErrorMessage('Invalid email format')).toBe('El correo electrónico no es válido.');
  });

  it('maps rate limit messages to the rate-limit message', () => {
    expect(getCreateUserErrorMessage('Too many requests')).toBe('Demasiados intentos. Espera unos minutos.');
    expect(getCreateUserErrorMessage('rate limit exceeded')).toBe('Demasiados intentos. Espera unos minutos.');
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(getCreateUserErrorMessage('something unexpected happened')).toBe('No se pudo crear la cuenta. Intenta de nuevo.');
  });
});

describe('createUserAsAdmin', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFetchIsAdmin.mockReset();
    mockCreateUser.mockReset();
    mockCreateAdminClient.mockReset();
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { createUser: mockCreateUser } },
    });
  });

  it('throws before calling fetchIsAdmin when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(
      createUserAsAdmin({ name: 'Ana', email: 'ana@example.com', password: 'password1', role: 'profesor' })
    ).rejects.toThrow();
    expect(mockFetchIsAdmin).not.toHaveBeenCalled();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('throws before instantiating createAdminClient when the user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(false);

    await expect(
      createUserAsAdmin({ name: 'Ana', email: 'ana@example.com', password: 'password1', role: 'profesor' })
    ).rejects.toThrow();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('rejects an empty/whitespace-only name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);

    const result = await createUserAsAdmin({ name: '   ', email: 'ana@example.com', password: 'password1', role: 'profesor' });
    expect(result).toEqual({ ok: false, error: 'El nombre es obligatorio.' });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);

    const result = await createUserAsAdmin({ name: 'Ana', email: 'not-an-email', password: 'password1', role: 'profesor' });
    expect(result).toEqual({ ok: false, error: 'El correo electrónico no es válido.' });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 8 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);

    const result = await createUserAsAdmin({ name: 'Ana', email: 'ana@example.com', password: 'short', role: 'profesor' });
    expect(result).toEqual({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('rejects role "academia"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);

    const result = await createUserAsAdmin({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password1',
      // @ts-expect-error — exercising a hand-crafted, non-'profesor' role
      role: 'academia',
    });
    expect(result).toEqual({ ok: false, error: 'Ese tipo de cuenta no está disponible por ahora.' });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('rejects a hand-crafted role "alumno"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);

    const result = await createUserAsAdmin({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password1',
      // @ts-expect-error — exercising a hand-crafted, non-'profesor' role
      role: 'alumno',
    });
    expect(result).toEqual({ ok: false, error: 'Ese tipo de cuenta no está disponible por ahora.' });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('creates the user and returns ok:true on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null });

    const result = await createUserAsAdmin({
      name: 'Ana',
      email: 'Ana@Example.com',
      password: 'password1',
      role: 'profesor',
    });

    expect(result).toEqual({
      ok: true,
      userId: 'new-user-1',
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password1',
    });
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'password1',
      email_confirm: true,
      user_metadata: { name: 'Ana', role: 'profesor', created_by: 'admin-1' },
    });
  });

  it('returns a friendly Spanish error when the Admin API returns a duplicate-email error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFetchIsAdmin.mockResolvedValue(true);
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { message: 'Email address already registered' } });

    const result = await createUserAsAdmin({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password1',
      role: 'profesor',
    });

    expect(result).toEqual({ ok: false, error: 'Ya existe una cuenta con este correo.' });
  });
});
