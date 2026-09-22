import { z } from 'zod';

export const tiposDocumentoValidos = ['FOTO_GRUA', 'LICENCIA', 'CERTIFICADO_MEDICO', 'RCV'] as const;
export type TipoDocumento = (typeof tiposDocumentoValidos)[number];

export const activoSchema = z.object({
  activo: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type ActivoInput = z.infer<typeof activoSchema>;

export const solicitarPagoSchema = z.object({
  monto: z.number().positive(),
  banco: z.string().min(2),
  telefono: z.string().min(6),
  cedulaORif: z.string().min(4),
});
export type SolicitarPagoInput = z.infer<typeof solicitarPagoSchema>;
