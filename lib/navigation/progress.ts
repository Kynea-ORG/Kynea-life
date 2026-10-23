/**
 * Utilidades para disparar la barra de progreso global ante transiciones
 * de ruta programáticas (ej. router.push, form redirects, filtros).
 */

export const ROUTE_PROGRESS_START_EVENT = 'kynea:route-progress-start';
export const ROUTE_PROGRESS_STOP_EVENT = 'kynea:route-progress-stop';

/**
 * Inicia la barra de progreso de navegación global en el borde superior.
 */
export function startRouteProgress(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROUTE_PROGRESS_START_EVENT));
  }
}

/**
 * Completa la barra de progreso de navegación global con fade-out.
 */
export function stopRouteProgress(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROUTE_PROGRESS_STOP_EVENT));
  }
}
