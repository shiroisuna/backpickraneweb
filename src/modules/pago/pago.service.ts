import { prisma } from '../../shared/lib/prisma.js';

const VALORES_POR_DEFECTO = {
  banco: process.env.PAGO_MOVIL_BANCO || 'Banco de Ejemplo',
  telefono: process.env.PAGO_MOVIL_TELEFONO || '0412-0000000',
  cedulaORif: process.env.PAGO_MOVIL_CEDULA || 'J-00000000-0',
};

/** Si nunca se ha configurado desde el admin, cae a las variables de entorno. */
export async function obtenerDatosPagoMovil() {
  const config = await prisma.configuracionPagoMovil.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!config) return VALORES_POR_DEFECTO;
  return { banco: config.banco, telefono: config.telefono, cedulaORif: config.cedulaORif };
}

export interface ActualizarPagoMovilInput {
  banco: string;
  telefono: string;
  cedulaORif: string;
}

export async function actualizarDatosPagoMovil(datos: ActualizarPagoMovilInput) {
  const existente = await prisma.configuracionPagoMovil.findFirst();
  if (existente) {
    return prisma.configuracionPagoMovil.update({ where: { id: existente.id }, data: datos });
  }
  return prisma.configuracionPagoMovil.create({ data: datos });
}
