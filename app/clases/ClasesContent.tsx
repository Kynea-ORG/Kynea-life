'use client';
import ClassBrowser from '@/components/ClassBrowser';
import type { DanceClass, Teacher } from '@/lib/types';

export default function ClasesContent({
  initialClasses,
  academias = [],
  danceStyles = [],
  levels = [],
}: {
  initialClasses: DanceClass[];
  academias?: Teacher[];
  danceStyles?: string[];
  levels?: string[];
}) {
  return (
    <ClassBrowser
      baseUrl="/clases"
      initialClasses={initialClasses}
      includeStyles
      danceStyles={danceStyles}
      levels={levels}
      searchPlaceholder="Busca por estilo, profesor, academia o distrito…"
      renderResultsCount={count => (
        <><span className="font-bold text-neutral-900">{count}</span> clase{count !== 1 ? 's' : ''} disponible{count !== 1 ? 's' : ''}</>
      )}
      emptyText="No encontramos clases con esos filtros. Prueba cambiando el estilo, ciudad o nivel."
      listName="clases_grid"
      enableMapView
      academias={academias}
    />
  );
}
