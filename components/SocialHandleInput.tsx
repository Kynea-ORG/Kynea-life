'use client';
import { useId, useRef, useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import {
  extractSocialHandle,
  buildInstagramUrl,
  buildTikTokUrl,
  buildYouTubeUrl,
  buildWebsiteUrl,
} from '@/lib/utils';

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'website';

export interface SocialHandleInputProps {
  platform: SocialPlatform;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  id?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  highlighted?: boolean;
}

const PLATFORM_META: Record<
  SocialPlatform,
  {
    defaultPlaceholder: string;
    hint: string;
    domainPreview: (handle: string) => string;
    buildUrl: (val: string) => string;
  }
> = {
  instagram: {
    defaultPlaceholder: 'usuario o pega tu link de Instagram',
    hint: 'Usuario o enlace',
    domainPreview: handle => `instagram.com/${handle}`,
    buildUrl: buildInstagramUrl,
  },
  tiktok: {
    defaultPlaceholder: 'usuario o pega tu link de TikTok',
    hint: 'Usuario o enlace',
    domainPreview: handle => `tiktok.com/@${handle}`,
    buildUrl: buildTikTokUrl,
  },
  youtube: {
    defaultPlaceholder: 'canal o pega tu link de YouTube',
    hint: 'Canal o enlace',
    domainPreview: handle => `youtube.com/@${handle}`,
    buildUrl: buildYouTubeUrl,
  },
  website: {
    defaultPlaceholder: 'tuacademia.com',
    hint: 'Enlace web',
    domainPreview: url => url.replace(/^https?:\/\//i, ''),
    buildUrl: buildWebsiteUrl,
  },
};

function looksLikeUrlOrAtHandle(raw: string, platform: SocialPlatform): boolean {
  if (platform === 'website') return false;
  const trimmed = raw.trim();
  if (trimmed.startsWith('@')) return true;
  return /(?:https?:\/\/|(?:www\.|m\.|vm\.|vt\.)?(?:instagram|tiktok|youtube)\.com\/)/i.test(trimmed);
}

export default function SocialHandleInput({
  platform,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  id,
  inputRef,
  highlighted = false,
}: SocialHandleInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const internalRef = useRef<HTMLInputElement | null>(null);
  const resolvedRef = inputRef ?? internalRef;
  const [autoCleaned, setAutoCleaned] = useState(false);

  const meta = PLATFORM_META[platform];
  const isSocialHandle = platform !== 'website';

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData?.getData('text') ?? '';
    if (!pasted) return;
    if (isSocialHandle && looksLikeUrlOrAtHandle(pasted, platform)) {
      const cleaned = extractSocialHandle(pasted, platform);
      if (cleaned) {
        e.preventDefault();
        onChange(cleaned);
        setAutoCleaned(true);
      }
    } else if (!isSocialHandle) {
      const trimmed = pasted.trim();
      if (trimmed !== pasted) {
        e.preventDefault();
        onChange(trimmed);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) {
      setAutoCleaned(false);
      onChange('');
      return;
    }

    if (isSocialHandle) {
      // Si pega desde teclado móvil (que a veces dispara onChange directo sin onPaste)
      if (/(?:https?:\/\/|(?:www\.|m\.|vm\.|vt\.)?(?:instagram|tiktok|youtube)\.com\/)/i.test(raw)) {
        const cleaned = extractSocialHandle(raw, platform);
        if (cleaned) {
          onChange(cleaned);
          setAutoCleaned(true);
          return;
        }
      }
      // Si escribe "@" al inicio, lo absorbemos porque el prefijo visual ya tiene "@"
      if (raw.startsWith('@')) {
        const withoutAt = raw.replace(/^@+/, '');
        onChange(withoutAt);
        return;
      }
    }

    setAutoCleaned(false);
    onChange(raw);
  };

  const handleBlur = () => {
    if (!value.trim()) {
      if (value !== '') onChange('');
      return;
    }
    if (isSocialHandle) {
      const cleaned = extractSocialHandle(value, platform);
      if (cleaned && cleaned !== value) {
        onChange(cleaned);
        setAutoCleaned(true);
      }
    } else {
      const normalized = buildWebsiteUrl(value);
      if (normalized && normalized !== value) {
        onChange(normalized);
      }
    }
  };

  const handleClear = () => {
    setAutoCleaned(false);
    onChange('');
    resolvedRef.current?.focus();
  };

  const cleanDisplayHandle = isSocialHandle ? extractSocialHandle(value, platform) : value.trim();
  const targetUrl = cleanDisplayHandle ? meta.buildUrl(cleanDisplayHandle) : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={inputId} className="block text-xs font-semibold text-neutral-700">
          {label}
          {required && <span className="text-red ml-0.5">*</span>}
        </label>
        <span className="text-[11px] text-neutral-400">{meta.hint}</span>
      </div>

      <div
        className={`flex items-center w-full bg-white border-2 rounded-btn transition-[border-color,box-shadow] duration-100 ease-out hover:border-neutral-900 focus-within:!border-primary ${
          highlighted
            ? '!border-amber ring-2 ring-amber/40'
            : 'border-neutral-200'
        }`}
      >
        {isSocialHandle && (
          <span
            aria-hidden="true"
            onClick={() => resolvedRef.current?.focus()}
            className="pl-4 pr-0.5 text-[15px] font-medium text-neutral-400 select-none cursor-text shrink-0"
          >
            @
          </span>
        )}

        <input
          ref={resolvedRef}
          id={inputId}
          type="text"
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={placeholder ?? meta.defaultPlaceholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`flex-1 min-w-0 bg-transparent py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none ${
            isSocialHandle ? 'pl-0.5 pr-3' : 'px-4'
          }`}
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Limpiar ${label}`}
            className="mr-2 p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {cleanDisplayHandle && targetUrl && (
        <div
          data-testid={`social-preview-${platform}`}
          className="mt-1.5 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs animate-fade-in"
        >
          <div className="flex items-center gap-1.5 min-w-0 text-neutral-600">
            <Check className="w-3.5 h-3.5 text-green-text shrink-0" />
            {isSocialHandle ? (
              <span className="truncate">
                {autoCleaned ? 'Usuario extraído:' : 'Se conectará a'}{' '}
                <strong className="font-semibold text-neutral-900">@{cleanDisplayHandle}</strong>
                <span className="text-neutral-400 hidden sm:inline">
                  {' '}· {meta.domainPreview(cleanDisplayHandle)}
                </span>
              </span>
            ) : (
              <span className="truncate">
                Se abrirá{' '}
                <strong className="font-semibold text-neutral-900">
                  {meta.domainPreview(targetUrl)}
                </strong>
              </span>
            )}
          </div>

          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-dark transition-colors shrink-0"
          >
            Probar <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
