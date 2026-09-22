import { z } from 'zod';

// El email NUNCA se puede cambiar desde aquí, a propósito.
export const actualizarPerfilSchema = z.object({
  nombre: z.string().min(2).optional(),
  telefono: z.string().optional(),
  cedula: z.string().optional(),
  direccion: z.string().optional(),
});
export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilSchema>;

export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1),
  passwordNueva: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;

export const solicitarRetiroSchema = z.object({
  monto: z.number().positive(),
  banco: z.string().min(2),
  telefono: z.string().min(6),
  cedulaORif: z.string().min(4),
});
export type SolicitarRetiroInput = z.infer<typeof solicitarRetiroSchema>;
