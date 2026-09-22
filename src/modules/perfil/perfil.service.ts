import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { RETIRO_CLIENTE_MINIMO } from '../../shared/lib/pricing.js';
import type { ActualizarPerfilInput, CambiarPasswordInput, SolicitarRetiroInput } from './perfil.schema.js';

const SELECT_PUBLICO = {
  id: true,
  email: true,
  nombre: true,
  telefono: true,
  rol: true,
  saldoAFavor: true,
  fotoPerfilUrl: true,
  cedula: true,
  direccion: true,
  emailVerificado: true,
  grueroPerfil: true,
} as const;

export async function obtenerPerfil(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: SELECT_PUBLICO });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  return usuario;
}

/** Actualiza datos personales. El email queda fuera a propósito — nunca es editable aquí. */
export async function actualizarPerfil(usuarioId: string, datos: ActualizarPerfilInput) {
  return prisma.usuario.update({ where: { id: usuarioId }, data: datos, select: SELECT_PUBLICO });
}

export async function subirFotoPerfil(usuarioId: string, url: string) {
  return prisma.usuario.update({ where: { id: usuarioId }, data: { fotoPerfilUrl: url }, select: SELECT_PUBLICO });
}

export async function cambiarPassword(usuarioId: string, datos: CambiarPasswordInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');

  const passwordOk = await bcrypt.compare(datos.passwordActual, usuario.password);
  if (!passwordOk) throw new AppError(401, 'La contraseña actual no es correcta');

  const nuevoHash = await bcrypt.hash(datos.passwordNueva, 10);
  await prisma.usuario.update({ where: { id: usuarioId }, data: { password: nuevoHash } });
  return { ok: true };
}

/**
 * El cliente pide que le devuelvan su saldo a favor (acumulado de vueltos).
 * Solo puede pedirlo si tiene al menos RETIRO_CLIENTE_MINIMO acumulado, y el
 * monto solicitado no puede superar lo que tiene ni ser menor al mínimo.
 */
export async function solicitarRetiro(usuarioId: string, datos: SolicitarRetiroInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');

  if (usuario.saldoAFavor < RETIRO_CLIENTE_MINIMO) {
    throw new AppError(400, `Necesitas al menos $${RETIRO_CLIENTE_MINIMO} acumulados para poder solicitar tu saldo.`);
  }
  if (datos.monto < RETIRO_CLIENTE_MINIMO) {
    throw new AppError(400, `El monto mínimo a solicitar es $${RETIRO_CLIENTE_MINIMO}.`);
  }
  if (datos.monto > usuario.saldoAFavor) {
    throw new AppError(400, 'No puedes solicitar más de tu saldo a favor.');
  }

  const yaTienePendiente = await prisma.solicitudPago.findFirst({
    where: { clienteId: usuarioId, estado: 'PENDIENTE' },
  });
  if (yaTienePendiente) {
    throw new AppError(409, 'Ya tienes una solicitud pendiente de que el admin la procese.');
  }

  return prisma.solicitudPago.create({
    data: {
      clienteId: usuarioId,
      monto: datos.monto,
      banco: datos.banco,
      telefono: datos.telefono,
      cedulaORif: datos.cedulaORif,
    },
  });
}
