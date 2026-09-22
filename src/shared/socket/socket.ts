import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import type { AuthPayload } from '../middleware/auth.middleware.js';
import { usuarioPerteneceAServicio, guardarMensaje } from '../../modules/servicio/servicio.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-produccion';

let ioInstance: Server | null = null;

/** Permite a otros módulos (ej. servicio.service.ts) emitir eventos sin pasar `io` por todos lados. */
export function getIO(): Server {
  if (!ioInstance) throw new Error('Socket.IO no ha sido inicializado todavía');
  return ioInstance;
}

interface UbicacionEnviarPayload {
  servicioId: string;
  lat: number;
  lng: number;
  bearing?: number;
}

/*
 * Reemplazo real de la simulación del frontend:
 *
 * - El GRUERO, activo en un servicio, emite 'ubicacion:enviar' con su
 *   posición real (navigator.geolocation.watchPosition en el navegador)
 *   cada pocos segundos.
 * - El servidor guarda esa posición y la retransmite a todos los
 *   CLIENTES que estén siguiendo ese servicio (sala `servicio:<id>`).
 * - El CLIENTE, al confirmar un servicio, hace socket.emit('servicio:seguir')
 *   y escucha 'ubicacion:actualizada' para mover el marcador con datos
 *   reales, no con un setInterval falso.
 */
export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No autenticado'));
    try {
      socket.data.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthPayload;

    // Cada gruero tiene su propia sala para recibir solicitudes dirigidas a él en vivo.
    if (user.rol === 'GRUERO') {
      socket.join(`gruero:${user.id}`);
    }

    socket.on('servicio:seguir', (servicioId: string) => {
      socket.join(`servicio:${servicioId}`);
    });

    socket.on('servicio:dejar', (servicioId: string) => {
      socket.leave(`servicio:${servicioId}`);
    });

    socket.on('ubicacion:enviar', async (data: UbicacionEnviarPayload) => {
      if (user.rol !== 'GRUERO') return;

      await prisma.grueroPerfil.update({
        where: { usuarioId: user.id },
        data: { ultimaLat: data.lat, ultimaLng: data.lng, ultimaActualizacion: new Date() },
      });

      io.to(`servicio:${data.servicioId}`).emit('ubicacion:actualizada', {
        lat: data.lat,
        lng: data.lng,
        bearing: data.bearing ?? 0,
        timestamp: Date.now(),
      });
    });

    /*
     * Chat del servicio: solo el cliente y el gruero de ese servicio pueden
     * mandar/recibir mensajes en su sala `servicio:<id>` (la misma que ya
     * usan para ubicación y cambios de estado). Se persiste en la tabla
     * Mensaje y se retransmite al instante.
     */
    socket.on('chat:enviar', async (data: { servicioId: string; texto: string }) => {
      const texto = (data.texto || '').trim();
      if (!texto || texto.length > 1000) return;

      const tieneAcceso = await usuarioPerteneceAServicio(data.servicioId, user.id);
      if (!tieneAcceso) return;

      const mensaje = await guardarMensaje(data.servicioId, user.id, texto);
      io.to(`servicio:${data.servicioId}`).emit('chat:nuevo', mensaje);
    });
  });

  return io;
}
