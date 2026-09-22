import { api } from './api';
import type { Servicio } from '../types';

export interface CrearServicioInput {
  grueroPerfilId: string;
  origenLat: number;
  origenLng: number;
  origenDireccion: string;
  destinoLat: number;
  destinoLng: number;
  destinoDireccion: string;
  distanciaKm?: number;
  duracionMin?: number;
  metodoPago: 'EFECTIVO' | 'PAGO_MOVIL';
  /** Requerido si metodoPago es EFECTIVO (para calcular el vuelto). */
  montoEntregado?: number;
  /** Requerido si metodoPago es PAGO_MOVIL (número de referencia de la transferencia ya hecha). */
  referenciaPago?: string;
}

/** El cliente crea la solicitud dirigida a un gruero específico que eligió. */
export async function crearServicio(datos: CrearServicioInput): Promise<Servicio> {
  const { data } = await api.post('/servicio', datos);
  return data;
}

/** Lo que ve el gruero: solicitudes dirigidas a él, pendientes de aceptar. */
export async function listarDisponibles(): Promise<Servicio[]> {
  const { data } = await api.get('/servicio/disponibles');
  return data;
}

export async function aceptarServicio(id: string): Promise<Servicio> {
  const { data } = await api.post(`/servicio/${id}/aceptar`);
  return data;
}

export async function cambiarEstadoServicio(
  id: string,
  estado: 'EN_CAMINO' | 'LLEGADA' | 'EN_TRASLADO' | 'COMPLETADO' | 'CANCELADO'
): Promise<Servicio> {
  const { data } = await api.patch(`/servicio/${id}/estado`, { estado });
  return data;
}

/** Historial del usuario actual (cliente ve los suyos, gruero los que le asignaron). */
export async function obtenerMisServicios(): Promise<Servicio[]> {
  const { data } = await api.get('/servicio/mis-servicios');
  return data;
}
