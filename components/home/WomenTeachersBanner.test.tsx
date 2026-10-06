// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import WomenTeachersBanner, { WOMEN_TEACHERS_HREF } from './WomenTeachersBanner';

afterEach(cleanup);

describe('WomenTeachersBanner', () => {
  it('todos sus enlaces llevan a las clases de profesoras', () => {
    render(<WomenTeachersBanner classCount={12} />);
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs)).toEqual(new Set(['/clases?profesoras=1']));
    expect(WOMEN_TEACHERS_HREF).toBe('/clases?profesoras=1');
  });

  it('muestra el título y cuántas clases hay', () => {
    render(<WomenTeachersBanner classCount={12} />);
    expect(screen.getByRole('heading', { name: 'Clases con profesoras mujeres' })).toBeInTheDocument();
    expect(screen.getByText('12 clases')).toBeInTheDocument();
  });

  it('singular y sin cantidad cuando no hay', () => {
    const { rerender } = render(<WomenTeachersBanner classCount={1} />);
    expect(screen.getByText('1 clase')).toBeInTheDocument();
    rerender(<WomenTeachersBanner classCount={0} />);
    expect(screen.queryByText(/\d+ clases?/)).not.toBeInTheDocument();
  });

  it('el enlace tiene un nombre accesible claro', () => {
    render(<WomenTeachersBanner classCount={5} />);
    expect(screen.getByRole('link', { name: /Clases con profesoras mujeres/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver clases/ })).toBeInTheDocument();
  });
});
