// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { mockUpdateProfile, mockRefreshProfile } = vi.hoisted(() => ({
  mockUpdateProfile: vi.fn(),
  mockRefreshProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/profiles/actions', () => ({ updateProfile: mockUpdateProfile }));
vi.mock('@/lib/profiles/imageActions', () => ({ uploadProfileImage: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() }, storage: { from: () => ({ remove: vi.fn() }) } }) }));
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ refreshProfile: mockRefreshProfile }),
}));
vi.mock('@/components/CountrySelect', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Nacionalidad" value={value} onChange={e => onChange(e.target.value)} />
  ),
}));

import PerfilClient from './PerfilClient';

const BASE_PROFILE = {
  name: 'Vale Alumna',
  bio: null,
  nationality: null,
  years_experience: null,
  ruc: null,
  whatsapp: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  website: null,
  photo_url: null,
  photo_position: null,
  photo_zoom: null,
  team_size: null,
  branch_count: null,
  cover_image_url: null,
  cover_image_position: null,
  cover_image_zoom: null,
  profile_styles: null,
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockUpdateProfile.mockResolvedValue(undefined);
  mockRefreshProfile.mockResolvedValue(undefined);
});

describe('PerfilClient', () => {
  it('como alumno muestra Contacto y redes (WhatsApp e Instagram opcionales) y oculta redes de profesor', () => {
    render(<PerfilClient role="alumno" profile={BASE_PROFILE} primaryVenue={null} danceStyles={['Salsa']} />);
    expect(screen.getByRole('heading', { name: /contacto y redes/i })).toBeInTheDocument();
    expect(screen.getByText(/opcional y privado/i)).toBeInTheDocument();
    expect(screen.getByText(/solo se compartirán con el profesor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/tiktok/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/youtube/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sitio web/i)).not.toBeInTheDocument();
  });

  it('como alumno permite guardar WhatsApp e Instagram y actualiza el contexto AuthProvider', async () => {
    render(<PerfilClient role="alumno" profile={BASE_PROFILE} primaryVenue={null} danceStyles={['Salsa']} />);
    fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: '999888777' } });
    fireEvent.change(screen.getByLabelText(/instagram/i), { target: { value: '@valebaila' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      whatsapp: '+51999888777',
      instagram: 'valebaila',
    })));
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
  });

  it('como alumno permite guardar vacío pero valida si ingresa WhatsApp incompleto', async () => {
    render(<PerfilClient role="alumno" profile={BASE_PROFILE} primaryVenue={null} danceStyles={['Salsa']} />);
    fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(await screen.findByText(/al menos 7 dígitos/i)).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/whatsapp/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      whatsapp: '',
      instagram: '',
    })));
  });

  it('como profesor mantiene todas las redes y exige al menos WhatsApp o Instagram', async () => {
    render(<PerfilClient role="profesor" profile={BASE_PROFILE} primaryVenue={null} danceStyles={['Salsa']} />);
    expect(screen.getByLabelText(/tiktok/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/youtube/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sitio web/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(await screen.findByText(/ingresa al menos tu whatsapp o instagram/i)).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
