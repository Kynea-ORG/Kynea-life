import { cancellationPolicyText } from '@/lib/bookings/rules';
import { formatLongDate } from '@/lib/bookings/dates';
import type { CancellationPolicy } from '@/lib/bookings/types';

// Plantillas de correo transaccional de reservas. HTML simple en tablas (compatible con
// Gmail/Outlook) y una versión de texto plano. Todo texto que escribe un usuario se escapa.

export interface RenderedEmail { subject: string; html: string; text: string }
interface RenderOptions { siteUrl: string }
type Payload = Record<string, unknown>;

const BRAND = '#8a11bc';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);

function details(p: Payload) {
  const date = str(p.date);
  const start = str(p.startTime);
  const end = str(p.endTime);
  const place = [str(p.venueName), str(p.address)].filter(Boolean).join(', ');
  const seats = Number(p.seats ?? 1);
  const price = Number(p.price ?? 0);
  return {
    title: str(p.classTitle) ?? 'tu clase',
    when: date ? `${formatLongDate(date)}${start ? ` · ${start}${end ? ` – ${end}` : ''}` : ''}` : undefined,
    place: place || undefined,
    reference: str(p.reference),
    mapsUrl: str(p.mapsUrl),
    seatsText: `${seats} cupo${seats !== 1 ? 's' : ''}`,
    priceText: price > 0 ? `${p.currency ?? 'PEN'} ${price.toFixed(2)} (se paga directo al profesor en la clase)` : 'Gratis',
    tips: [
      ['Calzado', list(p.footwear).join(', ')],
      ['Ropa', str(p.clothing) ?? ''],
      ['Lleva contigo', list(p.toBring).join(', ')],
    ].filter(([, v]) => v) as [string, string][],
    policy: cancellationPolicyText((str(p.cancellationPolicy) as CancellationPolicy) ?? 'moderada'),
  };
}

function layout(opts: { preheader: string; heading: string; intro: string; rows: [string, string][]; extra?: string; ctaLabel: string; ctaUrl: string; footer: string }) {
  const rows = opts.rows.map(([k, v]) =>
    `<tr><td style="padding:6px 0;color:#6b6a67;font-size:13px;width:110px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#0d0d0d;font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f9f8f6;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${BRAND};padding:18px 24px;color:#fff;font-size:20px;font-weight:800">Kynea</td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 8px;font-size:22px;color:#0d0d0d">${esc(opts.heading)}</h1><p style="margin:0;font-size:15px;line-height:1.5;color:#2e2e2c">${esc(opts.intro)}</p></td></tr>
<tr><td style="padding:12px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e4e0;border-bottom:1px solid #e5e4e0">${rows}</table></td></tr>
${opts.extra ?? ''}
<tr><td style="padding:16px 24px 28px"><a href="${esc(opts.ctaUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px">${esc(opts.ctaLabel)}</a></td></tr>
<tr><td style="padding:0 24px 24px;color:#9b9a96;font-size:12px;line-height:1.5">${esc(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

function tipsBlock(tips: [string, string][], teacher?: string): string {
  if (!tips.length) return '';
  const items = tips.map(([k, v]) => `<li style="margin:4px 0"><b>${esc(k)}:</b> ${esc(v)}</li>`).join('');
  return `<tr><td style="padding:4px 24px 8px"><div style="background:#f5e8fc;border-radius:12px;padding:14px 16px;font-size:14px;color:#2e2e2c"><b>${esc(teacher ? `${teacher.split(' ')[0]} te recomienda` : 'Recomendaciones del profesor')}</b><ul style="margin:8px 0 0;padding-left:18px">${items}</ul></div></td></tr>`;
}

function studentEmail(p: Payload, o: RenderOptions, kind: 'confirmed' | 'reminder'): RenderedEmail {
  const d = details(p);
  const days = Number(p.daysAway ?? NaN);
  const teacher = str(p.teacherName);
  const url = `${o.siteUrl}/dashboard/alumno/reservas`;
  const rows: [string, string][] = [
    ...(d.when ? [['Cuándo', d.when] as [string, string]] : []),
    ...(d.place ? [['Dónde', d.place + (d.reference ? ` (${d.reference})` : '')] as [string, string]] : []),
    ['Reserva', `${d.seatsText} · ${d.priceText}`],
  ];
  const subject = kind === 'confirmed'
    ? `Tu cupo en ${d.title} está listo`
    : days === 0 ? `Hoy tienes ${d.title}` : `Mañana tienes ${d.title}`;
  const heading = kind === 'confirmed' ? '¡Tu cupo está listo!' : days === 0 ? '¡Hoy es tu clase!' : '¡Mañana es tu clase!';
  const intro = kind === 'confirmed'
    ? `Reservaste ${d.title}${teacher ? ` con ${teacher}` : ''}. Aquí tienes todo lo que necesitas.`
    : `Te recordamos que tienes ${d.title}${teacher ? ` con ${teacher}` : ''}. ¡Que lo disfrutes!`;
  const footer = `${d.policy} Puedes cancelar desde «Mis reservas».`;
  const extra = tipsBlock(d.tips, teacher)
    + (d.mapsUrl ? `<tr><td style="padding:4px 24px"><a href="${esc(d.mapsUrl)}" style="color:${BRAND};font-weight:700;font-size:14px">Cómo llegar</a></td></tr>` : '');
  const text = [
    heading, '', intro, '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(d.mapsUrl ? [`Cómo llegar: ${d.mapsUrl}`] : []),
    ...(d.tips.length ? ['', 'Recomendaciones:', ...d.tips.map(([k, v]) => `- ${k}: ${v}`)] : []),
    '', footer, `Mis reservas: ${url}`,
  ].join('\n');
  return { subject, html: layout({ preheader: intro, heading, intro, rows, extra, ctaLabel: 'Ver mis reservas', ctaUrl: url, footer }), text };
}

function teacherEmail(p: Payload, o: RenderOptions): RenderedEmail {
  const d = details(p);
  const student = str(p.studentName) ?? 'Un alumno';
  const note = str(p.note);
  const url = `${o.siteUrl}/dashboard/reservas`;
  const heading = `${student} reservó en tu clase`;
  const intro = `${student} apartó ${d.seatsText} en ${d.title}.`;
  const rows: [string, string][] = [
    ...(d.when ? [['Cuándo', d.when] as [string, string]] : []),
    ['Reserva', `${d.seatsText} · ${d.priceText}`],
    ...(note ? [['Mensaje', note] as [string, string]] : []),
  ];
  const footer = 'Entra a tu panel para ver su perfil y marcar la asistencia después de la clase.';
  const text = [heading, '', intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', footer, `Reservas: ${url}`].join('\n');
  return { subject: `Nueva reserva: ${student} en ${d.title}`, html: layout({ preheader: intro, heading, intro, rows, ctaLabel: 'Ver reservas', ctaUrl: url, footer }), text };
}

const PRIVATE_REASONS = new Set(['session_cancelled']);

function cancelledEmail(p: Payload, o: RenderOptions): RenderedEmail {
  const d = details(p);
  const teacher = str(p.teacherName);
  const reasonRaw = str(p.reason);
  const reason = reasonRaw && !PRIVATE_REASONS.has(reasonRaw) ? reasonRaw : undefined;
  const url = `${o.siteUrl}/clases`;
  const heading = 'Se canceló tu reserva';
  const intro = `Tu reserva en ${d.title}${teacher ? ` con ${teacher}` : ''} ya no está activa. Sentimos el cambio.`;
  const rows: [string, string][] = [
    ...(d.when ? [['Era para', d.when] as [string, string]] : []),
    ...(reason ? [['Motivo', reason] as [string, string]] : []),
  ];
  const footer = 'No hace falta que hagas nada más: no se te cobró nada en Kynea. Si quieres, busca otra clase o escríbele al profesor.';
  const text = [heading, '', intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', footer, `Buscar otra clase: ${url}`].join('\n');
  return { subject: `Se canceló tu reserva en ${d.title}`, html: layout({ preheader: intro, heading, intro, rows, ctaLabel: 'Buscar otra clase', ctaUrl: url, footer }), text };
}

function cancelledByStudentEmail(p: Payload, o: RenderOptions): RenderedEmail {
  const d = details(p);
  const student = str(p.studentName) ?? 'Un alumno';
  const url = `${o.siteUrl}/dashboard/reservas`;
  const heading = `${student} canceló su reserva`;
  const intro = `${student} canceló ${d.seatsText} en ${d.title}. Ese cupo quedó libre otra vez.`;
  const rows: [string, string][] = d.when ? [['Era para', d.when]] : [];
  const footer = 'Tus otros alumnos de esa fecha siguen confirmados.';
  const text = [heading, '', intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', footer, `Reservas: ${url}`].join('\n');
  return { subject: `${student} canceló su reserva en ${d.title}`, html: layout({ preheader: intro, heading, intro, rows, ctaLabel: 'Ver reservas', ctaUrl: url, footer }), text };
}

export function renderEmail(template: string, payload: Payload, options: RenderOptions): RenderedEmail {
  switch (template) {
    case 'booking_confirmed': return studentEmail(payload, options, 'confirmed');
    case 'booking_reminder': return studentEmail(payload, options, 'reminder');
    case 'booking_received': return teacherEmail(payload, options);
    case 'booking_cancelled': return cancelledEmail(payload, options);
    case 'booking_cancelled_by_student': return cancelledByStudentEmail(payload, options);
    default: throw new Error(`Plantilla de correo desconocida: ${template}`);
  }
}
