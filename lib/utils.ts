export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    published: 'Publicada',
    draft: 'Borrador',
    finished: 'Finalizada',
    archived: 'Archivada',
  };
  return map[status] ?? status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    published: 'bg-emerald-50 text-emerald-700',
    draft: 'bg-gray-100 text-gray-500',
    finished: 'bg-blue-50 text-blue-600',
    archived: 'bg-yellow-50 text-yellow-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

export function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    clase: 'Clase', taller: 'Taller', curso: 'Curso',
    masterclass: 'Masterclass', evento: 'Evento', 'clase-suelta': 'Clase suelta',
  };
  return map[type] ?? type;
}

export function formatPrice(priceType: string, price: number, currency: string): string {
  if (priceType === 'Gratis') return 'Gratis';
  const symbol = currency === 'PEN' ? 'S/' : '$';
  const suffix = priceType === 'Mensual' ? '/mes' : priceType === 'Por clase' ? '/clase' : '';
  return `${symbol}${price}${suffix}`;
}

export function formatTimeSlots(slots: { days: string[]; startTime: string; endTime: string }[]): string {
  // DB `time` columns come back as "HH:MM:SS" — trim to "HH:MM" for display.
  return slots.map(s => `${s.days.join(', ')} · ${s.startTime.slice(0, 5)} – ${s.endTime.slice(0, 5)}`).join(' | ');
}

export function buildWhatsAppMessage(style: string, startDate: string, teacherPhone: string): string {
  // Append noon to avoid UTC-midnight parsing rolling the date back a day in UTC-5.
  const date = startDate
    ? new Date(`${startDate}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const text = encodeURIComponent(
    `Hola, vi tu clase de ${style}${date ? ` en Kynea el ${date}` : ' en Kynea'} y me gustaría asistir. ¿Está disponible?`
  );
  return `https://wa.me/${teacherPhone.replace(/\s+/g, '')}?text=${text}`;
}

// `venues.maps_url` exists in the schema but nothing writes to it — venues
// are saved from Google Places `placeId`/`lat`/`lng`, so build the Maps link
// from those instead of a column that's always empty in practice.
export function buildGoogleMapsUrl(opts: { placeId?: string; lat?: number; lng?: number; address?: string }): string | undefined {
  const { placeId, lat, lng, address } = opts;
  if (lat != null && lng != null) {
    const params = new URLSearchParams({ api: '1', query: `${lat},${lng}` });
    if (placeId) params.set('query_place_id', placeId);
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: address }).toString()}`;
  }
  return undefined;
}

export function getConversionRate(views: number, contacts: number): string {
  if (views === 0) return '0%';
  return `${Math.round((contacts / views) * 100)}%`;
}
