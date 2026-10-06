'use client';
import { useState, type HTMLAttributes } from 'react';
import LinkifiedText from '@/components/LinkifiedText';
import { needsReadMore } from '@/lib/classes/detailInfo';

// Texto largo recortado a 4 líneas en mobile con "Leer más" que expande en el mismo lugar.
// Desde lg no se recorta (el diseño de desktop muestra todo, como siempre) y el botón no existe.
export default function ClampedText({
  text,
  className = '',
  ...rest
}: { text?: string | null } & Omit<HTMLAttributes<HTMLParagraphElement>, 'children'>) {
  const [expanded, setExpanded] = useState(false);
  const long = needsReadMore(text ?? '');
  const collapsed = long && !expanded;

  return (
    <>
      <p
        className={`${className} whitespace-pre-line break-words [overflow-wrap:anywhere] ${collapsed ? 'line-clamp-4 lg:line-clamp-none' : ''}`}
        {...rest}
      >
        <LinkifiedText text={text} />
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="lg:hidden mt-2 text-[14px] font-extrabold text-neutral-900 underline underline-offset-[3px]"
        >
          {expanded ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </>
  );
}
