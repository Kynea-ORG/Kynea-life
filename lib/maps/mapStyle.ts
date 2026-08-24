// Estilo de marca compartido entre el mapa interactivo (GoogleMap.tsx, Maps
// JavaScript API) y las imágenes estáticas cacheadas (lib/maps/staticMap.ts,
// Static Maps API) — un solo lugar define el look del mapa en toda la app,
// para que el preview y el mapa real no se vean como dos mapas distintos.
//
// Sin Map ID (evita un paso extra de config en Google Cloud): apaga íconos
// de comercios/transporte que compiten con las píldoras de precio, pero a
// diferencia del estilo gris plano por defecto mantiene el mapa con más
// color — tierra y calles en el mismo morado suave de marca
// (--color-primary/--color-primary-bg en globals.css) en vez de gris neutro
// puro, y las áreas verdes (parques, bosques) visibles en verde real en vez
// de apagadas, como hacen Airbnb/Vrbo, para que el mapa se lea vivo y no
// como un widget monocromo incrustado.
export interface GoogleMapStyleRule {
  featureType?: string;
  elementType?: string;
  stylers: Array<{ visibility?: string; color?: string }>;
}

export const MAP_STYLE: GoogleMapStyleRule[] = [
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

  // Tierra y agua — morado suave en vez de gris plano.
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5eefa' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe1f7' }] },

  // POI: apagados por defecto (íconos/labels de comercios, etc.)...
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  // ...excepto parques y áreas naturales, que quedan visibles en verde —
  // estas reglas van después de las de arriba para ganar sobre 'poi'.
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ visibility: 'on', color: '#c8e8bd' }] },
  { featureType: 'poi.park', elementType: 'geometry.stroke', stylers: [{ visibility: 'on', color: '#a8d79a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ visibility: 'on', color: '#4f7a45' }] },
  { featureType: 'poi.park', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // Calles
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6d9f0' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#faf5fd' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e3c3f4' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c98fe0' }] },
];

// Traduce una regla { color: '#RRGGBB' } al formato `0xRRGGBB` que espera la
// Static Maps API (a diferencia de la Maps JavaScript API, que usa '#...').
function stylerToParam(styler: GoogleMapStyleRule['stylers'][number]): string | null {
  const parts: string[] = [];
  if (styler.color) parts.push(`color:0x${styler.color.replace('#', '')}`);
  if (styler.visibility) parts.push(`visibility:${styler.visibility}`);
  return parts.length ? parts.join('|') : null;
}

// Un `style=` por regla, en el formato que acepta la Static Maps API:
// `feature:X|element:Y|color:0x...|visibility:...`
export function mapStyleToStaticParams(style: GoogleMapStyleRule[] = MAP_STYLE): string[] {
  return style
    .map(rule => {
      const parts: string[] = [];
      if (rule.featureType) parts.push(`feature:${rule.featureType}`);
      if (rule.elementType) parts.push(`element:${rule.elementType}`);
      for (const styler of rule.stylers) {
        const param = stylerToParam(styler);
        if (param) parts.push(param);
      }
      return parts.join('|');
    })
    .filter(Boolean);
}
