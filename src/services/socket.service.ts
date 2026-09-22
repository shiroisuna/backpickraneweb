import { io, type Socket } from 'socket.io-client';
import { obtenerToken } from './auth.service';
import type { Servicio } from '../types';

let socket: Socket | null = null;

/** Conecta (o reutiliza) el socket autenticado con el JWT del usuario. */
export function conectarSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
    auth: { token: obtenerToken() },
  });
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

/** El cliente se une a la sala del servicio para recibir su ubicación y cambios de estado en vivo. */
export function seguirServicio(servicioId: string) {
  conectarSocket().emit('servicio:seguir', servicioId);
}

export function dejarDeSeguirServicio(servicioId: string) {
  socket?.emit('servicio:dejar', servicioId);
}

/** El gruero envía su posición real (navigator.geolocation), reemplazando la vieja simulación. */
export function enviarUbicacion(servicioId: string, lat: number, lng: number, bearing?: number) {
  conectarSocket().emit('ubicacion:enviar', { servicioId, lat, lng, bearing });
}

interface UbicacionActualizada {
  lat: number;
  lng: number;
  bearing: number;
  timestamp: number;
}

/** Devuelve una función para des-suscribirse (usar en el cleanup de useEffect). */
export function alRecibirUbicacion(callback: (data: UbicacionActualizada) => void) {
  const s = conectarSocket();
  s.on('ubicacion:actualizada', callback);
  return () => { s.off('ubicacion:actualizada', callback); };
}

/** Se dispara cuando un gruero acepta el servicio o cuando cambia de estado. */
export function alRecibirServicioActualizado(callback: (servicio: Partial<Servicio> & { id: string }) => void) {
  const s = conectarSocket();
  s.on('servicio:actualizado', callback);
  return () => { s.off('servicio:actualizado', callback); };
}

/** Solo para GRUERO: se dispara cuando le llega una solicitud nueva dirigida a él (efectivo, o pago móvil ya aprobado). */
export function alRecibirServicioNuevo(callback: (servicio: Servicio) => void) {
  const s = conectarSocket();
  s.on('servicio:nuevo', callback);
  return () => { s.off('servicio:nuevo', callback); };
}
