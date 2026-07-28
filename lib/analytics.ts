// Thin wrapper around GTM's dataLayer — GTM (see app/layout.tsx) only loads in
// production, so these pushes are harmless no-ops everywhere else (dataLayer
// just accumulates unread entries in an array). Each event name/shape here
// must have a matching Trigger + GA4 Event tag configured in the GTM
// container (GTM-KVGV4DR9) to actually reach GA4 — pushing here alone does
// nothing on its own.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function pushEvent(event: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// Fired once per completed registration (any role, any auth method) — see
// app/onboarding/page.tsx, the single place all four signup paths converge.
export function trackSignUp(params: { role: string; method: string }) {
  pushEvent('sign_up', { role: params.role, method: params.method });
}

// Fired whenever a student reaches out to a teacher via WhatsApp or
// Instagram — the core conversion event for the whole marketplace.
export function trackGenerateLead(params: {
  channel: 'whatsapp' | 'instagram';
  classId?: string;
  className?: string;
  classStyle?: string;
  teacherId?: string;
  teacherName?: string;
}) {
  pushEvent('generate_lead', {
    lead_channel: params.channel,
    class_id: params.classId,
    class_name: params.className,
    class_style: params.classStyle,
    teacher_id: params.teacherId,
    teacher_name: params.teacherName,
  });
}

// Top-of-funnel: fired on every link/button across the site that takes a
// visitor toward /registro or /login (Header, Home CTAs, the contact-gate
// modal, cross-links between the two auth pages, error-recovery banners).
// `location` identifies which of those entry points fired it, so a funnel
// report in GA4 can tell them apart.
export function trackAuthCtaClick(params: { action: 'registro' | 'login'; location: string }) {
  pushEvent('auth_cta_click', { auth_action: params.action, cta_location: params.location });
}

// Mid-funnel: fired when the visitor actually submits the registro/login
// form or clicks "Continuar con Google" on those pages — i.e. attempted the
// action, regardless of whether Supabase accepts it. Sits between
// auth_cta_click (intent) and sign_up (completed) in the funnel.
export function trackAuthAttempt(params: { action: 'registro' | 'login'; method: 'email' | 'google' | 'email_otp' }) {
  pushEvent('auth_attempt', { auth_action: params.action, auth_method: params.method });
}
