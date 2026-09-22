import { api } from './api';

export type TipoDocumento = 'FOTO_GRUA' | 'LICENCIA' | 'CERTIFICADO_MEDICO' | 'RCV';

export async function obtenerPerfilGruero() {
  const { data } = await api.get('/gruero/perfil');
  return data;
}

/** Sube un documento de certificación (uno por llamada). */
export async function subirDocumentoGruero(tipo: TipoDocumento, archivo: File) {
  const formData = new FormData();
  formData.append('tipo', tipo);
  formData.append('archivo', archivo);

  const { data } = await api.post('/gruero/documentos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function actualizarDisponibilidad(activo: boolean, lat?: number, lng?: number) {
  const { data } = await api.patch('/gruero/activo', { activo, lat, lng });
  return data;
}

/** Grueros activos y aprobados que el cliente puede elegir directamente (ruta separada, no requiere ser gruero). */
export async function listarGruerosActivos(): Promise<import('../types').GrueroActivo[]> {
  const { data } = await api.get('/grueros/activos');
  return data;
}
