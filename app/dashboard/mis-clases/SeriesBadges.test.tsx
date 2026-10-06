// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SeriesBadges from './SeriesBadges';

afterEach(cleanup);

const today = '2026-10-03';

describe('SeriesBadges', () => {
  it('no renderiza nada para una clase suelta', () => {
    const { container } = render(<SeriesBadges cls={{ status: 'published' }} today={today} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra "Serie" y cuándo se publica una copia programada', () => {
    render(<SeriesBadges cls={{ status: 'draft', seriesId: 's', autoPublishAt: '2026-10-20' }} today={today} />);
    expect(screen.getByText('Serie')).toBeInTheDocument();
    expect(screen.getByText('Se publica el 20 oct')).toBeInTheDocument();
  });

  it('muestra el aviso de publicación automática reciente', () => {
    render(<SeriesBadges cls={{ status: 'published', seriesId: 's', autoPublishedAt: '2026-10-01T11:00:00Z' }} today={today} />);
    expect(screen.getByText('Publicada automáticamente el 1 oct')).toBeInTheDocument();
  });

  it('muestra el error con el enlace para completar el perfil', () => {
    render(
      <SeriesBadges
        cls={{ status: 'draft', seriesId: 's', autoPublishAt: '2026-10-20', autoPublishError: 'Agrega tu WhatsApp en tu perfil.' }}
        today={today}
      />,
    );
    expect(screen.getByText(/Agrega tu WhatsApp/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Completar perfil' })).toHaveAttribute('href', '/dashboard/perfil');
  });
});
