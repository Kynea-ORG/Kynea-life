// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import SocialHandleInput, { type SocialPlatform } from './SocialHandleInput';

afterEach(cleanup);

function ControlledInput({ platform, initial = '' }: { platform: SocialPlatform; initial?: string }) {
  const [val, setVal] = useState(initial);
  return <SocialHandleInput platform={platform} label={platform} value={val} onChange={setVal} />;
}

describe('SocialHandleInput', () => {
  it('renders prefix @ for social platforms and strips leading @ when typing', () => {
    render(<ControlledInput platform="instagram" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '@joseniquen_' } });
    expect(input.value).toBe('joseniquen_');
    expect(screen.getByTestId('social-preview-instagram').textContent).toContain('@joseniquen_');
  });

  it('auto-extracts handle immediately when pasting a full Instagram, TikTok, or YouTube URL', () => {
    render(<ControlledInput platform="tiktok" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'https://www.tiktok.com/@dario_boada?_t=ZS-9A9k9twWGFm' },
    });
    expect(input.value).toBe('dario_boada');
    expect(screen.getByTestId('social-preview-tiktok').textContent).toContain('Usuario extraído:');
    expect(screen.getByTestId('social-preview-tiktok').textContent).toContain('@dario_boada');
  });

  it('renders testable link pointing to the clean profile URL', () => {
    render(<ControlledInput platform="youtube" initial="kynea-dance" />);
    const link = screen.getByRole('link', { name: /Probar/i });
    expect(link.getAttribute('href')).toBe('https://youtube.com/@kynea-dance');
  });

  it('normalizes website URL on blur by prepending https:// when missing', () => {
    render(<ControlledInput platform="website" initial="miacademia.pe" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.blur(input);
    expect(input.value).toBe('https://miacademia.pe');
  });

  it('clears value when clicking the clear button', () => {
    const onChange = vi.fn();
    render(<SocialHandleInput platform="instagram" label="Instagram" value="joseniquen_" onChange={onChange} />);
    const clearBtn = screen.getByRole('button', { name: 'Limpiar Instagram' });
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
