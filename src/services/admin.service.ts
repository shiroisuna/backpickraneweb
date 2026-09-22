import { api } from './api';
import type { EstadoCertificacion, GrueroPerfil } from '../types';

export async function listarGruerosPendientes(estado: EstadoCertificacion = 'EN_REVISION'): Promise<GrueroPerfil[]> {
  const { data } = await api.get('/admin/grueros', { params: { estado } });
  return data;
}

export async function obtenerDetalleGruero(id: string): Promise<GrueroPerfil> {
  const { data } = await api.get(`/admin/grueros/${id}`);
  return data;
}

export async function cambiarCertificacion(id: string, estado: 'APROBADO' | 'RECHAZADO'): Promise<GrueroPerfil> {
  const { data } = await api.patch(`/admin/grueros/${id}/certificacion`, { estado });
  return data;
}

/** Pagos móviles con referencia declarada, pendientes de verificar contra el banco. */
export async function listarPagosPendientes(): Promise<import('../types').PagoConServicio[]> {
  const { data } = await api.get('/admin/pagos');
  return data;
}

/** pagoId, no servicioId — el backend identifica el Pago por su propio id. */
export async function confirmarPago(pagoId: string, aprobar: boolean): Promise<import('../types').Servicio> {
  const { data } = await api.patch(`/admin/pagos/${pagoId}/confirmar`, { aprobar });
  return data;
}
