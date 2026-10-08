import Link from 'next/link';

interface LegalNavProps {
  current: 'terminos' | 'terminos-publicacion' | 'privacidad';
}

const LEGAL_TABS = [
  { id: 'terminos', label: 'Términos y Condiciones', href: '/terminos' },
  { id: 'terminos-publicacion', label: 'Reglas de Publicación', href: '/terminos-publicacion' },
  { id: 'privacidad', label: 'Política de Privacidad', href: '/privacidad' },
] as const;

export default function LegalNav({ current }: LegalNavProps) {
  return (
    <nav aria-label="Documentos legales" className="flex items-center gap-1 sm:gap-2 border-b border-neutral-200 mb-8 overflow-x-auto">
      {LEGAL_TABS.map(tab => {
        const active = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`pb-3 px-3 text-[13.5px] sm:text-[14px] font-medium transition-colors border-b-2 whitespace-nowrap ${
              active
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
