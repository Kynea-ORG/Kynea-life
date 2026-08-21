import { redirect } from 'next/navigation';

// La vista Mapa real vive ahora en /clases (toggle Lista/Mapa) — ver
// ClassBrowser.tsx y ClasesMapView.tsx. Esta ruta se conserva solo para no
// romper links/bookmarks viejos a /mapa, que antes mostraba un mapa CSS
// falso (sin Google Maps real, sin academias) sin ningún link real hacia ahí.
export default function MapaPage() {
  redirect('/clases?vista=mapa');
}
