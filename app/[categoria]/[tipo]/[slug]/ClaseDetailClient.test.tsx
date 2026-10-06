// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import ClaseDetailClient from './ClaseDetailClient';
import type { DanceClass } from '@/lib/types';

const push = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back }) }));
vi.mock('@/components/Header', () => ({ default: ({ className }: { className?: string }) => <header data-testid="site-header" className={className} /> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/components/ContactModal', () => ({ default: () => <div data-testid="contact-modal" /> }));
vi.mock('@/components/MapPreview', () => ({ default: () => <div data-testid="map-preview" /> }));
vi.mock('@/components/SmartImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
    rpc: async () => ({}),
  }),
}));
let authState: { user: { id: string } | null; isLoggedIn: boolean } = { user: null, isLoggedIn: false };
vi.mock('@/components/AuthProvider', () => ({ useAuth: () => authState }));
vi.mock('@/lib/analytics', () => ({
  trackGenerateLead: vi.fn(), trackAuthCtaClick: vi.fn(), trackViewItem: vi.fn(),
  trackSaveClass: vi.fn(), trackTeacherSocialClick: vi.fn(), trackSelectProfile: vi.fn(),
}));

function makeClass(over: Partial<DanceClass> = {}): DanceClass {
  return {
    id: 'c1', slug: 'flamenco-castanuelas', styleSlug: 'flamenco', type: 'taller', title: 'Flamenco Castañuelas Nivel Básico',
    style: 'Flamenco', level: 'Básico', shortDescription: '', fullDescription: 'Descubre el arte de las castañuelas.',
    startDate: '2099-09-06', recurrence: 'semanal',
    timeSlots: [{ days: ['Domingo'], startTime: '11:00:00', endTime: '12:00:00' }],
    priceType: 'Mensual', price: 240, offerPrice: 230, currency: 'PEN', modality: 'Presencial',
    city: 'Lima', district: 'Miraflores', venueName: 'Garage Studio', address: 'Av. Ernesto Diez Canseco', reference: 'Detrás de la catedral',
    lat: -12.12, lng: -77.03, mapImageUrl: 'https://maps.example/static.png',
    coverImage: 'cover.jpg', coverImagePosition: '50% 50%', coverImageZoom: 1,
    availableSpots: 7, maxSpots: 7, status: 'published', contactMode: 'whatsapp',
    requirements: ['Evaluación previa'], footwear: ['Zapatillas'], toBring: ['Agua'],
    teacher: {
      id: 't1', slug: 'atempo', name: 'ATEMPO - Studio de Baile Flamenco', type: 'academia', photo: '', photoPosition: '50% 50%', photoZoom: 1,
      bio: 'Soy María, directora de ATEMPO.', experience: 10, styles: [], whatsapp: '51999999999', showSpots: true, email: '',
    },
    ...over,
  } as unknown as DanceClass;
}

const hero = () => screen.getByTestId('detail-hero');

beforeEach(() => {
  authState = { user: null, isLoggedIn: false };
  Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(window.navigator, 'clipboard', { value: undefined, configurable: true });
});
afterEach(() => { cleanup(); push.mockReset(); back.mockReset(); });

describe('ClaseDetailClient · parte alta en mobile', () => {
  it('oculta el header del sitio en mobile (solo se ve desde lg)', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    expect(screen.getByTestId('site-header').className).toContain('max-lg:hidden');
  });

  it('la foto es una sola: sin contador ni puntos aunque la clase traiga galería', () => {
    render(<ClaseDetailClient cls={makeClass({ gallery: ['g1.jpg', 'g2.jpg'] })} />);
    expect(within(hero()).getAllByRole('img')).toHaveLength(1);
    expect(within(hero()).queryByText(/\d\s*\/\s*\d/)).toBeNull();
    // Los puntos de la galería, si llegaran a existir, nunca se muestran en mobile.
    const dots = hero().querySelector('[data-testid="gallery-dots"]');
    expect(dots === null || dots.className.includes('hidden')).toBe(true);
  });

  it('"atrás" vuelve a la pantalla anterior si hay historial', () => {
    window.history.pushState({}, '', '/a');
    window.history.pushState({}, '', '/b');
    render(<ClaseDetailClient cls={makeClass()} />);
    fireEvent.click(within(hero()).getByRole('button', { name: 'Volver' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('"atrás" va a /clases cuando no hay historial (enlace compartido)', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<ClaseDetailClient cls={makeClass()} />);
    fireEvent.click(within(hero()).getByRole('button', { name: 'Volver' }));
    expect(push).toHaveBeenCalledWith('/clases');
    expect(back).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('compartir usa el menú del celular cuando existe', async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(window.navigator, 'share', { value: share, configurable: true });
    render(<ClaseDetailClient cls={makeClass()} />);
    fireEvent.click(within(hero()).getByRole('button', { name: 'Compartir clase' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Flamenco Castañuelas Nivel Básico', url: expect.stringContaining('http') }));
  });

  it('compartir copia el enlace y avisa si el navegador no tiene menú de compartir', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ClaseDetailClient cls={makeClass()} />);
    fireEvent.click(within(hero()).getByRole('button', { name: 'Compartir clase' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Enlace copiado')).toBeInTheDocument();
  });

  it('guardar sin sesión lleva al login', async () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    fireEvent.click(within(hero()).getByRole('button', { name: 'Guardar clase' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });

  it('una clase finalizada no se puede guardar desde la foto', () => {
    render(<ClaseDetailClient cls={makeClass({ startDate: '2020-01-10', endDate: '2020-02-10' })} />);
    expect(within(hero()).queryByRole('button', { name: 'Guardar clase' })).toBeNull();
  });

  it('tiene un solo título (h1) con "por" + nombre de la academia como enlace al perfil', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const por = screen.getByTestId('title-by');
    expect(within(por).getByRole('link', { name: 'ATEMPO - Studio de Baile Flamenco' })).toHaveAttribute('href', '/academias/atempo');
  });

  it('muestra los chips de nivel y modalidad, y el de 1.ª clase gratis si aplica', () => {
    render(<ClaseDetailClient cls={makeClass({ isTrialFree: true })} />);
    const chips = screen.getByTestId('detail-chips');
    expect(within(chips).getByText('Nivel Básico')).toBeInTheDocument();
    expect(within(chips).getByText('Presencial')).toBeInTheDocument();
    expect(within(chips).getByText('1.ª clase gratis')).toBeInTheDocument();
  });

  it('fila de la academia tocable con tipo y experiencia', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    const row = screen.getByTestId('teacher-row');
    expect(row).toHaveAttribute('href', '/academias/atempo');
    expect(within(row).getByText(/Academia · \+de 10 años de experiencia/)).toBeInTheDocument();
  });

  it('los recuadros de cuándo y mapa están bajo la foto', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    const facts = screen.getByTestId('quick-facts');
    expect(within(facts).getByText('INICIA')).toBeInTheDocument();
    expect(within(facts).getByText('Garage Studio')).toBeInTheDocument();
  });

  it('una clase finalizada muestra el aviso debajo del título (además del banner de desktop)', () => {
    render(<ClaseDetailClient cls={makeClass({ startDate: '2020-01-10', endDate: '2020-02-10' })} />);
    expect(within(screen.getByTestId('expired-notice-mobile')).getByText(/Esta clase ya finalizó/)).toBeInTheDocument();
  });
});

describe('ClaseDetailClient · bloques de mobile más abajo', () => {
  it('"Dónde es" tiene el ancla que usa el recuadro del mapa y "Cómo llegar"', () => {
    render(<ClaseDetailClient cls={makeClass({ mapsUrl: undefined, placeId: 'abc' })} />);
    const where = document.getElementById('donde-es')!;
    expect(where).not.toBeNull();
    expect(within(where).getByText('Garage Studio')).toBeInTheDocument();
    expect(within(where).getByText('Detrás de la catedral')).toBeInTheDocument();
    expect(within(where).getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
  });

  it('sin coordenadas ni dirección no hay bloque "Dónde es"', () => {
    render(<ClaseDetailClient cls={makeClass({ lat: undefined, lng: undefined, venueName: undefined, address: undefined, reference: undefined, modality: 'Online' })} />);
    expect(document.getElementById('donde-es')).toBeNull();
  });

  it('la biografía de la academia va recortada con "Ver perfil"', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    const card = screen.getByTestId('teacher-card-mobile');
    expect(within(card).getByRole('link', { name: 'Ver perfil de la academia' })).toHaveAttribute('href', '/academias/atempo');
  });

  it('el bloque "Antes de ir" reúne requisitos y qué traer', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    expect(screen.getByText('Antes de ir')).toBeInTheDocument();
  });
});

describe('ClaseDetailClient · barra fija inferior', () => {
  it('con oferta: precio vigente arriba y el anterior tachado debajo, sin la línea de nivel', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    const bar = screen.getByTestId('sticky-bar');
    expect(within(bar).getByText('S/230/mes')).toBeInTheDocument();
    expect(within(bar).getByText('S/240/mes').className).toContain('line-through');
    expect(within(bar).queryByText(/Nivel/)).toBeNull();
  });

  it('sin oferta: una sola línea de precio', () => {
    render(<ClaseDetailClient cls={makeClass({ offerPrice: undefined })} />);
    const bar = screen.getByTestId('sticky-bar');
    expect(within(bar).getByText('S/240/mes')).toBeInTheDocument();
    expect(bar.querySelector('.line-through')).toBeNull();
  });

  it('mantiene el botón de WhatsApp y abre el modal de contacto sin sesión', () => {
    render(<ClaseDetailClient cls={makeClass()} />);
    fireEvent.click(within(screen.getByTestId('sticky-bar')).getByRole('button', { name: /WhatsApp/ }));
    expect(screen.getByTestId('contact-modal')).toBeInTheDocument();
  });
});
