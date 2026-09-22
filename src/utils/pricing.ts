// Espejo de backend/src/shared/lib/pricing.ts — solo para mostrar una estimación
// mientras el cliente configura la solicitud. La tarifa real y definitiva
// siempre la calcula el backend al crear el servicio (nunca confíes en el
// valor de aquí para cobrar).
const PRECIO_POR_KM_USD = 1.25;
const DISTANCIA_MINIMA_COBRABLE_KM = 20;

export function calcularTarifaEstimada(distanciaKm: number): number {
  const distanciaCobrable = Math.max(distanciaKm, DISTANCIA_MINIMA_COBRABLE_KM);
  return Number((distanciaCobrable * PRECIO_POR_KM_USD).toFixed(2));
}
