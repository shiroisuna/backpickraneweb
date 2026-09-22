import axios from 'axios';
import type { Coordenadas, SugerenciaLugar } from '../types';

/** Busca lugares por texto, priorizando Venezuela. Usado en el autocompletado de direcciones. */
export async function buscarLugares(query: string): Promise<SugerenciaLugar[]> {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: query, format: 'json', countrycodes: 've', addressdetails: 1, limit: 5 },
  });
  return response.data;
}

/** Geocodificación inversa: convierte coordenadas (ej. al arrastrar un marcador) en una dirección legible. */
export async function direccionDesdeCoordenadas(coords: Coordenadas): Promise<string> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat: coords[0], lon: coords[1], format: 'json' },
    });
    return response.data?.display_name || `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
  } catch {
    return `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
  }
}
