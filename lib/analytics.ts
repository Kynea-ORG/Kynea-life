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

// Closes the login funnel — fired once the role is actually known, unlike
// auth_attempt (login) which fires on submit before Supabase even confirms
// the credentials. Email/password: app/login/page.tsx's redirectByRole
// onSuccess. Google: the destination page reads the `?login=1` flag
// app/auth/callback/route.ts adds to the redirect, since that route runs
// server-side and can't push to dataLayer itself.
export function trackLoginSuccess(params: { role: string; method: 'email' | 'google' }) {
  pushEvent('login_success', { role: params.role, method: params.method });
}

// Fired when verifyOtp() returns an error (wrong or expired code) —
// app/confirmar-email/page.tsx's handleVerify(). Diagnostic-only, no params:
// distinguishes "attempted but failed" from the auth_attempt(email_otp) that
// already fired on submit, which can't tell success from failure on its own.
export function trackOtpVerifyFailed() {
  pushEvent('otp_verify_failed', {});
}

// Fired when a profesor/academia advances a step in the onboarding wizard —
// app/onboarding/page.tsx's handleNext(), only once validateStep() passes.
// stepNumber is 0-indexed, matching that page's own `step` state (0: Datos
// públicos, 1: Contacto, 2: Especialidad). Step 3 ("Validación") never fires
// this — its completion is trackOnboardingComplete below. Alumno has no
// per-step event; their carousel is covered entirely by trackOnboardingComplete's
// `skipped` param.
export function trackOnboardingStepComplete(params: { role: string; stepNumber: number; stepName: string }) {
  pushEvent('onboarding_step_complete', { role: params.role, step_number: params.stepNumber, step_name: params.stepName });
}

// Fired once the profile is actually usable — the real close of the signup
// funnel, distinct from sign_up (account exists) above. profesor/academia:
// app/onboarding/page.tsx's handleFinish(), after updateProfile() saves.
// alumno: AlumnoWelcome.tsx's finish(), whether they completed the 3-slide
// carousel or hit "Omitir" (skipped: true either way for that role).
export function trackOnboardingComplete(params: { role: string; skipped: boolean }) {
  pushEvent('onboarding_complete', { role: params.role, skipped: params.skipped });
}

// Fired when a profesor/academia advances a step in CrearClaseForm.tsx's
// wizard (goNext()). Unlike onboarding's step tracker, this form has no
// per-step validation gate — goNext() always advances regardless of whether
// required fields are filled, so this fires on every "Continuar" click, not
// just "real" progress. See docs/informe-marcaciones-gtm.md section 3.7.
export function trackCreateClassStepComplete(params: { stepNumber: number; stepName: string; isEdit: boolean }) {
  pushEvent('create_class_step_complete', { step_number: params.stepNumber, step_name: params.stepName, is_edit: params.isEdit });
}

// Fired once createClass(fd) resolves without error — never for
// updateClassFromForm (editing an existing class), since this measures the
// "first class created" business event, not every save.
export function trackClassCreated(params: { status: string; classType: string; classStyle: string }) {
  pushEvent('class_created', { status: params.status, class_type: params.classType, class_style: params.classStyle });
}

// Fired when a publish/save attempt is blocked because the profesor/academia
// has no WhatsApp/Instagram configured on their profile (payload.code ===
// 'MISSING_CONTACT_CHANNEL'). Can happen on both a new class and an edit —
// the same catch block in CrearClaseForm.tsx wraps createClass and
// updateClassFromForm, hence isEdit.
export function trackCreateClassBlocked(params: { isEdit: boolean }) {
  pushEvent('create_class_blocked', { is_edit: params.isEdit });
}

// Fired once app/clases/[id]/ClaseDetailClient.tsx mounts — enriches GA4's
// automatic pageview with dimensions it doesn't carry on its own (style,
// teacher, price).
export function trackViewItem(params: {
  classId: string;
  className: string;
  classStyle: string;
  classType: string;
  teacherId: string;
  price: number;
}) {
  pushEvent('view_item', {
    class_id: params.classId,
    class_name: params.className,
    class_style: params.classStyle,
    class_type: params.classType,
    teacher_id: params.teacherId,
    price: params.price,
  });
}

// Fired when a class card/link is clicked from a listing, before navigating
// to its detail page — listName identifies the surface it was clicked from
// (see ClassCard's call sites plus /mapa's own bespoke "Ver clase" link,
// which doesn't render ClassCard at all). Together with trackViewItem and
// trackGenerateLead this covers the discovery funnel end to end.
export function trackSelectItem(params: {
  classId: string;
  className: string;
  classStyle: string;
  teacherId: string;
  listName: string;
}) {
  pushEvent('select_item', {
    class_id: params.classId,
    class_name: params.className,
    class_style: params.classStyle,
    teacher_id: params.teacherId,
    list_name: params.listName,
  });
}

// Fired once per actual search submission on the Home hero — the single
// convergence point (navigateSearch(), app/HomeClient.tsx) that the desktop
// form, the mobile "Buscar" button and "Ver todos los resultados" all funnel
// through. Typing/autocomplete browsing never fires this on its own — GA4's
// `search` is meant for a completed search, not a keystroke.
export function trackSearch(params: { searchTerm: string; city: string }) {
  pushEvent('search', { search_term: params.searchTerm, city: params.city });
}

// Fired once a class is actually added to saved_classes (not on unsave) —
// app/[categoria]/[tipo]/[slug]/ClaseDetailClient.tsx's toggleSave(). The
// logged-out branch of that same handler already fires
// auth_cta_click({ location: 'save_class_gate' }) instead.
export function trackSaveClass(params: { classId: string; className: string; classStyle: string; teacherId: string }) {
  pushEvent('save_class', {
    class_id: params.classId,
    class_name: params.className,
    class_style: params.classStyle,
    teacher_id: params.teacherId,
  });
}

// Fired when the visitor switches between the Lista/Mapa toggle in
// components/ClassBrowser.tsx (any of its 4 trigger points — the desktop
// segmented control, the mobile floating "Mapa" button, the mobile "Volver
// a lista" button, and ClasesMapView's own "Ver lista" callback) — never on
// the initial view resolved from ?vista=mapa on mount, and never when
// clicking the already-active option. listName identifies the surface
// (clases_grid, categorias_grid), same convention as trackSelectItem.
export function trackMapViewToggle(params: { viewType: 'lista' | 'mapa'; listName: string }) {
  pushEvent('map_view_toggle', { view_type: params.viewType, list_name: params.listName });
}

// The profesor/academia counterpart of trackViewItem — fired once
// app/profesores/[slug]/ProfesorDetailClient.tsx mounts. Deliberately a
// separate event from view_item (a profile is not a listing item and has no
// price/class_type), so a funnel over classes stays uncontaminated. For an
// academia this is its storefront view count — the one metric that answers
// "how much exposure did Kynea give my academia this month?".
export function trackViewProfile(params: { role: 'profesor' | 'academia'; profileId: string; profileName: string }) {
  pushEvent('view_profile', { role: params.role, profile_id: params.profileId, profile_name: params.profileName });
}

// The profesor/academia counterpart of trackSelectItem — fired when a
// profile card/link is clicked from a listing, before navigating to it.
// listName identifies the surface (home_academias, home_profesores,
// profesores_directorio, home_search_autocomplete, clases_grid_mapa), so the
// discovery funnel for profiles reads the same way the one for classes does.
export function trackSelectProfile(params: { role: 'profesor' | 'academia'; profileId: string; profileName: string; listName: string }) {
  pushEvent('select_profile', {
    role: params.role,
    profile_id: params.profileId,
    profile_name: params.profileName,
    list_name: params.listName,
  });
}

// Fired when a visitor clicks a teacher's own social/web link (Instagram,
// TikTok, website) shown on a class detail or profile page. Deliberately NOT
// generate_lead: those links leave Kynea toward the teacher's own channels
// and are exploratory, so folding them into the conversion event would
// inflate it. Tracking them at all is what makes this contact visible —
// otherwise the visitor leaves the site with no trace.
export function trackTeacherSocialClick(params: {
  channel: 'instagram' | 'tiktok' | 'website';
  teacherId: string;
  teacherName: string;
  surface: string;
}) {
  pushEvent('teacher_social_click', {
    social_channel: params.channel,
    teacher_id: params.teacherId,
    teacher_name: params.teacherName,
    surface: params.surface,
  });
}
