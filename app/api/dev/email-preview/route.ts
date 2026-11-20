import { NextResponse, type NextRequest } from 'next/server';
import { renderEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

// Solo desarrollo: vista previa de las plantillas con datos de ejemplo.
//   /api/dev/email-preview?template=booking_confirmed   (o booking_received, booking_reminder)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'No disponible' }, { status: 404 });
  const template = request.nextUrl.searchParams.get('template') ?? 'booking_confirmed';
  const sample = {
    bookingId: 'demo', classTitle: 'Taller de Bachata Sensual', seats: 2, price: 80, currency: 'PEN', paymentMethod: 'pay_at_venue',
    date: '2026-11-23', startTime: '19:00', endTime: '20:30', venueName: 'Estudio Sol', address: 'Av. Benavides 1234, Miraflores',
    reference: 'Frente al parque Kennedy', mapsUrl: 'https://maps.google.com', footwear: ['Zapatillas limpias'], clothing: 'Ropa cómoda',
    toBring: ['Agua', 'Toalla pequeña'], cancellationPolicy: 'moderada', teacherName: 'Carlos Pérez', studentName: 'Valentina Ríos',
    note: 'Soy principiante, tengo la rodilla sensible.', daysAway: 1,
  };
  try {
    return new NextResponse(renderEmail(template, sample, { siteUrl: request.nextUrl.origin }).html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch {
    return NextResponse.json({ error: 'Plantilla desconocida' }, { status: 400 });
  }
}
