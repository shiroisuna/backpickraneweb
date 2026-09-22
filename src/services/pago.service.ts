import { api } from './api';
import type { DatosPagoMovil } from '../types';

export async function obtenerDatosPagoMovil(): Promise<DatosPagoMovil> {
  const { data } = await api.get('/pago/datos-pago-movil');
  return data;
}
