'use client';
import ClassBrowser from '@/components/ClassBrowser';
import type { DanceClass, Teacher } from '@/lib/types';
import type { LocationOption } from '@/lib/catalog/queries';

export default function ClasesContent({
  initialClasses,
  academias = [],
  danceStyles = [],
  levels = [],
  countries = [],
  locationOptions = [],
  fallbackLocation,
}: {
  initialClasses: DanceClass[];
  academias?: Teacher[];
  danceStyles?: string[];
  levels?: string[];
  countries?: string[];
  locationOptions?: LocationOption[];
  fallbackLocation?: { lat: number; lng: number } | null;
}) {
  return (
    <ClassBrowser
      baseUrl="/clases"
      initialClasses={initialClasses}
      includeStyles
      danceStyles={danceStyles}
      levels={levels}
      countries={countries}
      searchPlaceholder="Busca por estilo, clase o profesor…"
      renderResultsCount={count => (
        <><span className="font-bold text-neutral-900">{count}</span> clase{count !== 1 ? 's' : ''} disponible{count !== 1 ? 's' : ''}</>
      )}
      emptyText="No encontramos clases con esos filtros. Prueba cambiando el estilo, ciudad o nivel."
      listName="clases_grid"
      enableMapView
      academias={academias}
      locationOptions={locationOptions}
      fallbackLocation={fallbackLocation}
    />
  );
}
