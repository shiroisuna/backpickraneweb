export const PRECIO_POR_KM_USD = 1.25;
export const DISTANCIA_MINIMA_COBRABLE_KM = 20;

/**
 * Tarifa BASE según distancia real (lo que realmente le corresponde al
 * gruero). Referencia de mercado (Venezuela, 2025): paquetes de remolque
 * de hasta 35km rondan los $38 (fuente pública: "Grúas en Venezuela:
 * tarifas", 2001online.com), lo que arroja ~$1.1-1.25/km. Se aplica un piso
 * de 20km cobrables para no subcotizar trayectos cortos, ya que hay costos
 * fijos de salida/llegada independientes de la distancia.
 *
 * Ajusta PRECIO_POR_KM_USD y DISTANCIA_MINIMA_COBRABLE_KM según tu mercado real.
 */
export function calcularTarifaBase(distanciaKm: number): number {
  const distanciaCobrable = Math.max(distanciaKm, DISTANCIA_MINIMA_COBRABLE_KM);
  return Number((distanciaCobrable * PRECIO_POR_KM_USD).toFixed(2));
}

export const COMISION_PLATAFORMA = 0.015; // 1.5%, se SUMA a la tarifa base (no se resta)

/**
 * Desglose completo de precio: base (para el gruero), comisión de la
 * plataforma (1.5%, se le suma al costo) y total (lo que paga el cliente,
 * sea en efectivo, pago móvil o saldo).
 */
export function calcularDesgloseTarifa(distanciaKm: number) {
  const base = calcularTarifaBase(distanciaKm);
  const comision = Number((base * COMISION_PLATAFORMA).toFixed(2));
  const total = Number((base + comision).toFixed(2));
  return { base, comision, total };
}

/** @deprecated usa calcularDesgloseTarifa — se mantiene por compatibilidad. */
export function calcularTarifa(distanciaKm: number): number {
  return calcularDesgloseTarifa(distanciaKm).total;
}

/** @deprecated usa COMISION_PLATAFORMA */
export const COMISION_PLATAFORMA_EFECTIVO = COMISION_PLATAFORMA;

/** Monto mínimo de saldo a favor que un cliente debe tener acumulado para poder pedir que se lo devuelvan. */
export const RETIRO_CLIENTE_MINIMO = 50;
