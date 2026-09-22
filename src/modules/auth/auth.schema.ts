import { z } from 'zod';

const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2),
  telefono: z.string().optional(),
});

const clienteSchema = baseSchema.extend({
  rol: z.literal('CLIENTE'),
});

// Los documentos (fotos, licencia, cert. médico, RCV) se suben aparte,
// en un segundo paso, vía POST /gruero/documentos (son archivos, multipart).
// La membresía mensual ($10) se declara aquí mismo, igual que un pago móvil
// del cliente: el gruero transfiere a la cuenta de la app y da su número de
// referencia; un admin la confirma en el módulo de membresías.
const grueroSchema = baseSchema.extend({
  rol: z.literal('GRUERO'),
  tipoGrua: z.string().min(2),
  placa: z.string().min(4),
  direccion: z.string().min(4),
  latitud: z.number(),
  longitud: z.number(),
  referenciaMembresia: z.string().min(4, 'Indica el número de referencia del pago de tu membresía'),
});

export const registroSchema = z.discriminatedUnion('rol', [clienteSchema, grueroSchema]);
export type RegistroInput = z.infer<typeof registroSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const solicitarRecuperacionSchema = z.object({
  email: z.string().email(),
});
export type SolicitarRecuperacionInput = z.infer<typeof solicitarRecuperacionSchema>;

export const restablecerPasswordSchema = z.object({
  token: z.string().min(10),
  passwordNueva: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
export type RestablecerPasswordInput = z.infer<typeof restablecerPasswordSchema>;
