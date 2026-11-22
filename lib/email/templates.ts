import { cancellationPolicyText } from '@/lib/bookings/rules';
import { formatLongDate } from '@/lib/bookings/dates';
import {
  buildStudentToTeacherMessage,
  buildTeacherToStudentMessage,
  resolveStudentChannels,
  resolveTeacherChannels,
} from '@/lib/bookings/contact';
import type { CancellationPolicy } from '@/lib/bookings/types';
import { formatPriceShort } from '@/lib/utils';

// Plantillas de correo transaccional de reservas. HTML simple en tablas (compatible con
// Gmail/Outlook) y una versión de texto plano. Todo texto que escribe un usuario se escapa.

export interface RenderedEmail { subject: string; html: string; text: string }
interface RenderOptions { siteUrl: string }
type Payload = Record<string, unknown>;

const BRAND = '#8a11bc';
const WA_GREEN = '#16a34a';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);
const safeHttpUrl = (v: unknown) => {
  const raw = str(v);
  return raw && /^https?:\/\//i.test(raw) ? raw : undefined;
};

function details(p: Payload) {
  const date = str(p.date);
  const start = str(p.startTime);
  const end = str(p.endTime);
  const isOnline = str(p.modality) === 'Online';
  const place = isOnline ? 'Clase online (coordinas el enlace con tu profesor)' : [str(p.venueName), str(p.address)].filter(Boolean).join(', ');
  const seats = Number(p.seats ?? 1);
  const price = Number(p.price ?? 0);
  const currency = str(p.currency) ?? 'PEN';
  const priceFormatted = formatPriceShort('Pago único', price, currency);
  const paymentNote = '(coordinas el pago directo con el profesor)';
  return {
    title: str(p.classTitle) ?? 'tu clase',
    isOnline,
    date,
    when: date ? `${formatLongDate(date)}${start ? ` · ${start}${end ? ` – ${end}` : ''}` : ''}` : undefined,
    place: place || undefined,
    reference: isOnline ? undefined : str(p.reference),
    mapsUrl: isOnline ? undefined : safeHttpUrl(p.mapsUrl),
    seats,
    seatsText: `${seats} cupo${seats !== 1 ? 's' : ''}`,
    price,
    priceFormatted,
    priceText: price > 0 ? priceFormatted : 'Gratis',
    pendingPriceText: price > 0 ? `${priceFormatted} ${paymentNote}` : 'Gratis',
    tips: [
      ['Calzado', list(p.footwear).join(', ')],
      ['Ropa', str(p.clothing) ?? ''],
      ['Lleva contigo', list(p.toBring).join(', ')],
    ].filter(([, v]) => v) as [string, string][],
    policy: cancellationPolicyText((str(p.cancellationPolicy) as CancellationPolicy) ?? 'moderada'),
  };
}

function layout(opts: {
  preheader: string;
  heading: string;
  intro: string;
  rows: [string, string][];
  extra?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCta?: { label: string; url: string };
  footer: string;
}) {
  const rows = opts.rows.map(([k, v]) =>
    `<tr><td style="padding:6px 0;color:#6b6a67;font-size:13px;width:110px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#0d0d0d;font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('');
  const secondary = opts.secondaryCta
    ? ` <a href="${esc(opts.secondaryCta.url)}" style="display:inline-block;margin-left:8px;margin-top:8px;border:1px solid #d4d3cf;color:#0d0d0d;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px">${esc(opts.secondaryCta.label)}</a>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f9f8f6;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${BRAND};padding:18px 24px;color:#fff;font-size:20px;font-weight:800">Kynea</td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 8px;font-size:22px;color:#0d0d0d">${esc(opts.heading)}</h1><p style="margin:0;font-size:15px;line-height:1.5;color:#2e2e2c">${esc(opts.intro)}</p></td></tr>
${rows ? `<tr><td style="padding:12px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e4e0;border-bottom:1px solid #e5e4e0">${rows}</table></td></tr>` : ''}
${opts.extra ?? ''}
<tr><td style="padding:16px 24px 28px"><a href="${esc(opts.ctaUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px">${esc(opts.ctaLabel)}</a>${secondary}</td></tr>
<tr><td style="padding:0 24px 24px;color:#9b9a96;font-size:12px;line-height:1.5">${esc(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

function tipsBlock(tips: [string, string][], teacher?: string): string {
  if (!tips.length) return '';
  const items = tips.map(([k, v]) => `<li style="margin:4px 0"><b>${esc(k)}:</b> ${esc(v)}</li>`).join('');
  return `<tr><td style="padding:4px 24px 8px"><div style="background:#f5e8fc;border-radius:12px;padding:14px 16px;font-size:14px;color:#2e2e2c"><b>${esc(teacher ? `${teacher.split(' ')[0]} te recomienda` : 'Recomendaciones del profesor')}</b><ul style="margin:8px 0 0;padding-left:18px">${items}</ul></div></td></tr>`;
}

function contactButtonsHtml(opts: {
  title: string;
  whatsappUrl?: string | null;
  whatsappLabel?: string;
  instagramUrl?: string | null;
  instagramLabel?: string;
}): string {
  if (!opts.whatsappUrl && !opts.instagramUrl) return '';
  const buttons: string[] = [];
  if (opts.whatsappUrl) {
    buttons.push(
      `<a href="${esc(opts.whatsappUrl)}" style="display:inline-block;background:${WA_GREEN};color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 14px;border-radius:8px;margin-right:8px;margin-top:6px">${esc(opts.whatsappLabel ?? 'Escribir por WhatsApp')}</a>`,
    );
  }
  if (opts.instagramUrl) {
    buttons.push(
      `<a href="${esc(opts.instagramUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 14px;border-radius:8px;margin-top:6px">${esc(opts.instagramLabel ?? 'Escribir por Instagram')}</a>`,
    );
  }
  return `<tr><td style="padding:8px 24px 4px"><div style="background:#f8f7f5;border:1px solid #e5e4e0;border-radius:12px;padding:14px 16px"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0d0d0d">${esc(opts.title)}</p>${buttons.join('')}</div></td></tr>`;
}

function studentEmail(p: Payload, o: RenderOptions, kind: 'confirmed' | 'reminder' | 'approved'): RenderedEmail {
  const d = details(p);
  const days = Number(p.daysAway ?? NaN);
  const teacher = str(p.teacherName);
  const url = `${o.siteUrl}/dashboard/mis-reservas`;
  const rows: [string, string][] = [
    ...(d.when ? [['Cuándo', d.when] as [string, string]] : []),
    ...(d.place ? [['Dónde', d.place + (d.reference ? ` (${d.reference})` : '')] as [string, string]] : []),
    ['Reserva', `${d.seatsText} · ${d.priceText}`],
  ];
  const subject = kind === 'confirmed'
    ? `Tu cupo en ${d.title} está listo`
    : kind === 'approved'
      ? `¡Reserva confirmada! ${d.title}`
      : days === 0 ? `Hoy tienes ${d.title}` : `Mañana tienes ${d.title}`;
  const heading = kind === 'confirmed'
    ? '¡Tu cupo está listo!'
    : kind === 'approved'
      ? '¡Tu reserva fue confirmada!'
      : days === 0 ? '¡Hoy es tu clase!' : '¡Mañana es tu clase!';
  const intro = kind === 'confirmed'
    ? `Reservaste ${d.title}${teacher ? ` con ${teacher}` : ''}. Aquí tienes todo lo que necesitas.`
    : kind === 'approved'
      ? `${teacher ? `${teacher} confirmó` : 'Se confirmó'} tu cupo en ${d.title}. ¡Nos vemos en clase!`
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

function studentPendingEmail(p: Payload, o: RenderOptions): RenderedEmail {
  const d = details(p);
  const teacher = str(p.teacherName);
  const url = `${o.siteUrl}/dashboard/mis-reservas`;
  const waMsg = buildStudentToTeacherMessage({
    teacherName: teacher,
    classTitle: d.title,
    date: d.date,
    seats: d.seats,
  });
  const channels = resolveTeacherChannels({
    contactMode: str(p.contactMode),
    whatsapp: str(p.teacherWhatsapp),
    instagram: str(p.teacherInstagram),
    showWhatsapp: typeof p.teacherShowWhatsapp === 'boolean' ? p.teacherShowWhatsapp : undefined,
    message: waMsg,
  });

  const rows: [string, string][] = [
    ['Estado', 'Pendiente de confirmación'],
    ...(d.when ? [['Cuándo', d.when] as [string, string]] : []),
    ...(d.place ? [['Dónde', d.place + (d.reference ? ` (${d.reference})` : '')] as [string, string]] : []),
    ['Reserva', `${d.seatsText} · ${d.pendingPriceText}`],
  ];
  const subject = `Solicitud recibida: ${d.title} (pendiente de confirmación)`;
  const heading = '¡Solicitud enviada! Falta confirmar';
  const intro = `Apartamos ${d.seatsText} en ${d.title}${teacher ? ` con ${teacher}` : ''}. Escríbele directamente para coordinar el pago y confirmar tu cupo sin esperar.`;
  const footer = 'Mientras esté pendiente puedes cancelar gratis en cualquier momento desde «Mis reservas». Una vez confirmada aplicará la política de cancelación de la clase.';

  const extra = contactButtonsHtml({
    title: teacher ? `Escribe a ${teacher.split(' ')[0]} para confirmar tu cupo` : 'Escribe al profesor para confirmar tu cupo',
    whatsappUrl: channels.whatsappUrl,
    whatsappLabel: 'Escribir por WhatsApp',
    instagramUrl: channels.instagramUrl,
    instagramLabel: channels.instagramHandle ? `Instagram (${channels.instagramHandle})` : 'Escribir por Instagram',
  }) + tipsBlock(d.tips, teacher);

  const contactLines = [
    ...(channels.whatsappUrl ? [`WhatsApp del profesor: ${channels.whatsappUrl}`] : []),
    ...(channels.instagramUrl ? [`Instagram del profesor: ${channels.instagramUrl}`] : []),
  ];
  const text = [
    heading, '', intro, '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(contactLines.length ? ['', 'Contacto del profesor:', ...contactLines] : []),
    '', footer, `Mis reservas: ${url}`,
  ].join('\n');

  return {
    subject,
    html: layout({ preheader: intro, heading, intro, rows, extra, ctaLabel: 'Ver mis reservas', ctaUrl: url, footer }),
    text,
  };
}

function teacherEmail(p: Payload, o: RenderOptions): RenderedEmail {
  const d = details(p);
  const student = str(p.studentName) ?? 'Un alumno';
  const note = str(p.note);
  const isPending = str(p.status) === 'pending_confirmation';
  const actionToken = str(p.actionToken);
  const actionUrl = actionToken ? `${o.siteUrl}/reservas/accion?t=${encodeURIComponent(actionToken)}` : undefined;
  const panelUrl = `${o.siteUrl}/dashboard/reservas`;

  const waMsg = buildTeacherToStudentMessage({
    studentName: student,
    classTitle: d.title,
    date: d.date,
    confirmed: !isPending,
  });
  const studentChannels = resolveStudentChannels({
    whatsapp: str(p.studentWhatsapp),
    instagram: str(p.studentInstagram),
    message: waMsg,
  });

  const heading = isPending
    ? `${student} solicitó un cupo en tu clase`
    : `${student} reservó en tu clase`;
  const intro = isPending
    ? `${student} apartó ${d.seatsText} en ${d.title} (pendiente de confirmación). Coordina el pago y confirma su cupo en 1 clic.`
    : `${student} apartó ${d.seatsText} en ${d.title}.`;

  const contactSummary = [
    studentChannels.whatsappDisplay ? `WhatsApp: ${studentChannels.whatsappDisplay}` : null,
    studentChannels.instagramHandle ? `Instagram: ${studentChannels.instagramHandle}` : null,
  ].filter(Boolean).join(' · ');

  const rows: [string, string][] = [
    ...(isPending ? [['Estado', 'Pendiente de confirmación'] as [string, string]] : []),
    ...(d.when ? [['Cuándo', d.when] as [string, string]] : []),
    ['Reserva', `${d.seatsText} · ${isPending ? d.pendingPriceText : d.priceText}`],
    ...(contactSummary ? [['Contacto', contactSummary] as [string, string]] : []),
    ...(note ? [['Mensaje', note] as [string, string]] : []),
  ];

  const extra = contactButtonsHtml({
    title: `Contactar a ${student.split(' ')[0]}`,
    whatsappUrl: studentChannels.whatsappUrl,
    whatsappLabel: 'WhatsApp del alumno',
    instagramUrl: studentChannels.instagramUrl,
    instagramLabel: studentChannels.instagramHandle ? `Instagram (${studentChannels.instagramHandle})` : 'Instagram del alumno',
  });

  const ctaLabel = isPending && actionUrl ? 'Confirmar o liberar cupo' : 'Ver reservas';
  const ctaUrl = isPending && actionUrl ? actionUrl : panelUrl;
  const secondaryCta = isPending && actionUrl ? { label: 'Abrir mi panel', url: panelUrl } : undefined;
  const footer = isPending
    ? 'Puedes confirmar o liberar este cupo en 1 clic desde el botón de arriba o desde «Reservas recibidas».'
    : 'Entra a tu panel para ver su perfil y gestionar tus reservas.';

  const text = [
    heading, '', intro, '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(studentChannels.whatsappUrl ? [`WhatsApp del alumno: ${studentChannels.whatsappUrl}`] : []),
    ...(studentChannels.instagramUrl ? [`Instagram del alumno: ${studentChannels.instagramUrl}`] : []),
    '',
    footer,
    ...(isPending && actionUrl ? [`Confirmar o liberar cupo: ${actionUrl}`] : []),
    `Reservas: ${panelUrl}`,
  ].join('\n');

  const subject = isPending
    ? `Por confirmar: ${student} en ${d.title}`
    : `Nueva reserva: ${student} en ${d.title}`;

  return {
    subject,
    html: layout({ preheader: intro, heading, intro, rows, extra, ctaLabel, ctaUrl, secondaryCta, footer }),
    text,
  };
}

interface PendingReminderItem {
  bookingId?: string;
  studentName?: string;
  seats?: number;
  price?: number;
  currency?: string;
  note?: string;
  studentWhatsapp?: string;
  studentInstagram?: string;
  actionToken?: string;
}

function teacherPendingReminderEmail(p: Payload, o: RenderOptions): RenderedEmail {
  const d = details(p);
  const kind = str(p.kind) === 'post_class' ? 'post_class' : 'pre_class';
  const hoursBefore = Number(p.reminderHoursBefore ?? 24);
  const rawItems = Array.isArray(p.items) ? (p.items as PendingReminderItem[]) : [];
  const count = rawItems.length;
  const panelUrl = `${o.siteUrl}/dashboard/reservas`;

  const subject = kind === 'post_class'
    ? `Último aviso: ${count} reserva${count !== 1 ? 's' : ''} sin confirmar en ${d.title}`
    : `Tienes ${count} reserva${count !== 1 ? 's' : ''} por confirmar · ${d.title}`;
  const heading = kind === 'post_class'
    ? '¿Confirmamos estas reservas pendientes?'
    : 'Confirma tus reservas antes de la clase';
  const intro = kind === 'post_class'
    ? `Tu clase "${d.title}" ya pasó y aún tienes ${count} solicitud${count !== 1 ? 'es' : ''} pendiente${count !== 1 ? 's' : ''}. Confírmalas o libera el cupo antes de que se cierren automáticamente como "Sin confirmar" a las 48 horas.`
    : `Faltan menos de ${hoursBefore} hora${hoursBefore !== 1 ? 's' : ''} para "${d.title}" y tienes ${count} solicitud${count !== 1 ? 'es' : ''} pendiente${count !== 1 ? 's' : ''}. Contáctalos para asegurar pago y asistencia, y confirma cada cupo en 1 clic.`;

  const rows: [string, string][] = [
    ['Clase', d.title],
    ...(d.when ? [['Cuándo', d.when] as [string, string]] : []),
    ['Pendientes', `${count} reserva${count !== 1 ? 's' : ''}`],
  ];

  const cardsHtml = rawItems.map(item => {
    const name = str(item.studentName) ?? 'Alumno';
    const seats = Number(item.seats ?? 1);
    const price = Number(item.price ?? 0);
    const currency = str(item.currency) ?? 'PEN';
    const priceStr = price > 0 ? formatPriceShort('Pago único', price, currency) : 'Gratis';
    const note = str(item.note);
    const waMsg = buildTeacherToStudentMessage({ studentName: name, classTitle: d.title, date: d.date });
    const ch = resolveStudentChannels({
      whatsapp: str(item.studentWhatsapp),
      instagram: str(item.studentInstagram),
      message: waMsg,
    });
    const actionUrl = str(item.actionToken)
      ? `${o.siteUrl}/reservas/accion?t=${encodeURIComponent(str(item.actionToken)!)}`
      : panelUrl;

    const links: string[] = [];
    if (ch.whatsappUrl) {
      links.push(`<a href="${esc(ch.whatsappUrl)}" style="display:inline-block;background:${WA_GREEN};color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:7px 11px;border-radius:7px;margin-right:6px;margin-top:6px">WhatsApp</a>`);
    }
    if (ch.instagramUrl) {
      links.push(`<a href="${esc(ch.instagramUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:7px 11px;border-radius:7px;margin-right:6px;margin-top:6px">Instagram${ch.instagramHandle ? ` (${esc(ch.instagramHandle)})` : ''}</a>`);
    }
    links.push(`<a href="${esc(actionUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:7px 12px;border-radius:7px;margin-top:6px">Confirmar / liberar</a>`);

    return `<div style="border:1px solid #e5e4e0;border-radius:12px;padding:12px 14px;margin-bottom:10px;background:#faf9f7">
      <p style="margin:0;font-size:14px;font-weight:700;color:#0d0d0d">${esc(name)} <span style="font-weight:500;color:#6b6a67">· ${seats} cupo${seats !== 1 ? 's' : ''} · ${esc(priceStr)}</span></p>
      ${note ? `<p style="margin:4px 0 0;font-size:12px;color:#4a4946">Mensaje: "${esc(note)}"</p>` : ''}
      <div style="margin-top:6px">${links.join('')}</div>
    </div>`;
  }).join('');

  const extra = cardsHtml ? `<tr><td style="padding:8px 24px 4px">${cardsHtml}</td></tr>` : '';

  const textItems = rawItems.map(item => {
    const name = str(item.studentName) ?? 'Alumno';
    const seats = Number(item.seats ?? 1);
    const ch = resolveStudentChannels({ whatsapp: str(item.studentWhatsapp), instagram: str(item.studentInstagram) });
    const actionUrl = str(item.actionToken)
      ? `${o.siteUrl}/reservas/accion?t=${encodeURIComponent(str(item.actionToken)!)}`
      : panelUrl;
    return [
      `- ${name} (${seats} cupo${seats !== 1 ? 's' : ''})`,
      ...(ch.whatsappUrl ? [`  WhatsApp: ${ch.whatsappUrl}`] : []),
      ...(ch.instagramUrl ? [`  Instagram: ${ch.instagramUrl}`] : []),
      `  Confirmar o liberar: ${actionUrl}`,
    ].join('\n');
  });

  const footer = kind === 'post_class'
    ? 'Si no tomas acción en las próximas horas, las solicitudes sin confirmar se cerrarán automáticamente.'
    : 'Puedes gestionar todas tus reservas pendientes en un solo lugar desde tu panel.';

  const text = [
    heading, '', intro, '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(textItems.length ? ['', ...textItems] : []),
    '', footer, `Panel de reservas: ${panelUrl}`,
  ].join('\n');

  return {
    subject,
    html: layout({ preheader: intro, heading, intro, rows, extra, ctaLabel: 'Ver todas en mi panel', ctaUrl: panelUrl, footer }),
    text,
  };
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
  const footer = 'Tus otros alumnos de esa fecha siguen activos.';
  const text = [heading, '', intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', footer, `Reservas: ${url}`].join('\n');
  return { subject: `${student} canceló su reserva en ${d.title}`, html: layout({ preheader: intro, heading, intro, rows, ctaLabel: 'Ver reservas', ctaUrl: url, footer }), text };
}

export function renderEmail(template: string, payload: Payload, options: RenderOptions): RenderedEmail {
  switch (template) {
    case 'booking_confirmed': return studentEmail(payload, options, 'confirmed');
    case 'booking_pending': return studentPendingEmail(payload, options);
    case 'booking_approved': return studentEmail(payload, options, 'approved');
    case 'booking_reminder': return studentEmail(payload, options, 'reminder');
    case 'booking_received': return teacherEmail(payload, options);
    case 'teacher_pending_reminder': return teacherPendingReminderEmail(payload, options);
    case 'booking_cancelled': return cancelledEmail(payload, options);
    case 'booking_cancelled_by_student': return cancelledByStudentEmail(payload, options);
    default: throw new Error(`Plantilla de correo desconocida: ${template}`);
  }
}
