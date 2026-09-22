import { z } from 'zod';

export const filtroEstadoSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO']).optional(),
});

export const cambiarCertificacionSchema = z.object({
  estado: z.enum(['APROBADO', 'RECHAZADO']),
});
export type CambiarCertificacionInput = z.infer<typeof cambiarCertificacionSchema>;

export const confirmarPagoSchema = z.object({
  aprobar: z.boolean(),
});
export type ConfirmarPagoInput = z.infer<typeof confirmarPagoSchema>;

export const actualizarPagoMovilSchema = z.object({
  banco: z.string().min(2),
  telefono: z.string().min(6),
  cedulaORif: z.string().min(4),
});
export type ActualizarPagoMovilInput = z.infer<typeof actualizarPagoMovilSchema>;

export const confirmarMembresiaSchema = z.object({
  aprobar: z.boolean(),
});
export type ConfirmarMembresiaInput = z.infer<typeof confirmarMembresiaSchema>;
