'use client';
import { useState, type HTMLAttributes } from 'react';
import LinkifiedText from '@/components/LinkifiedText';
import { needsReadMore } from '@/lib/classes/detailInfo';

// Texto largo recortado con "Leer más" que expande en el mismo lugar: a 4 líneas en mobile y, si es muy largo,
// a 6 en desktop. Un texto de largo medio se ve completo en desktop y sin botón ahí.
export default function ClampedText({
  text,
  className = '',
  ...rest
}: { text?: string | null } & Omit<HTMLAttributes<HTMLParagraphElement>, 'children'>) {
  const [expanded, setExpanded] = useState(false);
  const longMobile = needsReadMore(text ?? '', 4, 34);
  const longDesktop = needsReadMore(text ?? '', 6, 95);
  if (!longMobile) {
    return (
      <p className={`${className} whitespace-pre-line break-words [overflow-wrap:anywhere]`} {...rest}>
        <LinkifiedText text={text} />
      </p>
    );
  }

  const clamp = expanded ? '' : `line-clamp-4 ${longDesktop ? 'lg:line-clamp-6' : 'lg:line-clamp-none'}`;
  return (
    <>
      <p className={`${className} whitespace-pre-line break-words [overflow-wrap:anywhere] ${clamp}`} {...rest}>
        <LinkifiedText text={text} />
      </p>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className={`${longDesktop ? 'lg:inline-block' : 'lg:hidden'} mt-2 text-[14px] font-extrabold text-neutral-900 underline underline-offset-[3px]`}
      >
        {expanded ? 'Leer menos' : 'Leer más'}
      </button>
    </>
  );
}
