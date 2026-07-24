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
