import Link from 'next/link';
import { seriesInfo } from '@/lib/classes/seriesLabels';

// Marcas de serie bajo el título de una clase en Mis clases: "Serie", cuándo se
// publica sola, si ya se publicó sola y, si falló, por qué (con salida directa).
export default function SeriesBadges({
  cls,
  today,
}: {
  cls: { status: string; seriesId?: string; autoPublishAt?: string; autoPublishedAt?: string; autoPublishError?: string };
  today: string;
}) {
  const info = seriesInfo(cls, today);
  if (!info.inSeries) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">Serie</span>
      {info.scheduled && (
        <span className="text-[11px] font-semibold text-primary bg-primary-bg px-1.5 py-0.5 rounded">{info.scheduled}</span>
      )}
      {info.autoPublished && (
        <span className="text-[11px] font-semibold text-green-dark bg-green-bg px-1.5 py-0.5 rounded">{info.autoPublished}</span>
      )}
      {info.error && (
        <span className="text-[11px] text-amber-text bg-amber-bg px-1.5 py-0.5 rounded">
          {info.error}{' '}
          <Link href="/dashboard/perfil" className="font-bold underline whitespace-nowrap">Completar perfil</Link>
        </span>
      )}
    </div>
  );
}
