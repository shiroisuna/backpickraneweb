import { API_BASE_URL } from '../services/api';

/** Los documentos se guardan como ruta relativa ("/uploads/xxx"); esto arma la URL completa. */
export function urlArchivo(rutaRelativa: string): string {
  return `${API_BASE_URL}${rutaRelativa}`;
}
