// lib/search/aiSearchCopy.ts
//
// Textos del buscador con IA (Home desktop, Home mobile y overlay mobile).
// Escritos como los diría una persona común, no como un formulario.

export const AI_SEARCH_LABEL = '¿Qué tienes ganas de bailar?';

// El primero es el estático del primer paint (antes de que el hook empiece
// a rotar). Mantenerlos cortos: en mobile se truncan.
export const AI_PLACEHOLDER_EXAMPLES = [
  'Cuéntame qué tienes en mente…',
  'Quiero soltar el estrés bailando…',
  'Salsa para principiantes en Miraflores…',
  'Nunca he bailado, ¿por dónde empiezo?',
  'Algo los sábados en la mañana…',
  'Una clase para mi hija de 8 años…',
  'Quiero bailar con mi pareja…',
  'Algo para después del trabajo…',
];

// Se envían tal cual como consulta: el del niño debe seguir diciendo "niño"
// para que el filtro infantil de searchService lo detecte.
export const AI_QUICK_PROMPTS = [
  '🧘 Quiero desestresarme después del trabajo',
  '💃 Nunca he bailado, quiero empezar',
  '⚡ Algo para subir la energía',
  '👧 Algo para mis niños el fin de semana',
];

export const AI_QUICK_PROMPTS_TITLE = 'Por ejemplo';
export const AI_SUBMIT_LABEL = 'Buscar';
export const AI_SUBMIT_LOADING_LABEL = 'Buscando…';
