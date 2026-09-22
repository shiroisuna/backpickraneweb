import { z } from 'zod';

export const crearServicioSchema = z
  .object({
    grueroPerfilId: z.string().min(1),
    origenLat: z.number(),
    origenLng: z.number(),
    origenDireccion: z.string().min(3),
    destinoLat: z.number(),
    destinoLng: z.number(),
    destinoDireccion: z.string().min(3),
    distanciaKm: z.number().optional(),
    duracionMin: z.number().optional(),
    metodoPago: z.enum(['EFECTIVO', 'PAGO_MOVIL', 'SALDO']),
    // Efectivo: con cuánto va a pagar el cliente (para calcular el vuelto)
    montoEntregado: z.number().optional(),
    // Pago móvil: número de referencia de la transferencia ya realizada
    referenciaPago: z.string().optional(),
  })
  .refine((d) => d.metodoPago !== 'EFECTIVO' || d.montoEntregado != null, {
    message: 'Indica con cuánto vas a pagar en efectivo',
    path: ['montoEntregado'],
  })
  .refine((d) => d.metodoPago !== 'PAGO_MOVIL' || (d.referenciaPago && d.referenciaPago.length >= 4), {
    message: 'Indica el número de referencia de tu pago móvil',
    path: ['referenciaPago'],
  });
export type CrearServicioInput = z.infer<typeof crearServicioSchema>;

// El gruero marca EN_CAMINO -> LLEGADA -> COMPLETADO (el paso a EN_TRASLADO
// tiene su propio endpoint porque acepta una foto opcional, ver /:id/traslado);
// cliente o gruero pueden CANCELAR en cualquier punto antes de COMPLETADO.
export const cambiarEstadoSchema = z.object({
  estado: z.enum(['EN_CAMINO', 'LLEGADA', 'COMPLETADO', 'CANCELADO']),
});
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;

export const calificarSchema = z.object({
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});
export type CalificarInput = z.infer<typeof calificarSchema>;

export const enviarMensajeSchema = z.object({
  texto: z.string().min(1).max(1000),
});
export type EnviarMensajeInput = z.infer<typeof enviarMensajeSchema>;
