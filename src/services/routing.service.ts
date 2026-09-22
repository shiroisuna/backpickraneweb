import axios from 'axios';
import type { Coordenadas, RutaCalculada } from '../types';

/** Calcula la ruta manejando entre origen y destino usando OSRM público. */
export async function calcularRuta(origin: Coordenadas, destination: Coordenadas): Promise<RutaCalculada | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
  const response = await axios.get(url);
  const data = response.data;

  if (!data.routes || data.routes.length === 0) return null;

  const route = data.routes[0];
  const routeCoords: Coordenadas[] = route.geometry.coordinates.map(
    (c: [number, number]) => [c[1], c[0]] as Coordenadas
  );

  return {
    routeCoords,
    distanciaKm: Number((route.distance / 1000).toFixed(1)),
    duracionMin: Math.round(route.duration / 60),
  };
}
