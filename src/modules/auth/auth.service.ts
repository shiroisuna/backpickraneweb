import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generarToken } from '../../shared/middleware/auth.middleware.js';
import { enviarCorreoBienvenidaYVerificacion, enviarCorreoRecuperacion } from '../../shared/lib/email.js';
import type { RegistroInput, LoginInput, SolicitarRecuperacionInput, RestablecerPasswordInput } from './auth.schema.js';

function serializarUsuario(usuario: {
  id: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: 'CLIENTE' | 'GRUERO' | 'ADMIN';
  saldoAFavor: number;
  fotoPerfilUrl?: string | null;
  cedula?: string | null;
  direccion?: string | null;
  emailVerificado: boolean;
  grueroPerfil: unknown;
}) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono ?? null,
    rol: usuario.rol,
    saldoAFavor: usuario.saldoAFavor,
    fotoPerfilUrl: usuario.fotoPerfilUrl ?? null,
    cedula: usuario.cedula ?? null,
    direccion: usuario.direccion ?? null,
    emailVerificado: usuario.emailVerificado,
    grueroPerfil: usuario.grueroPerfil,
  };
}

function generarToken32() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Paso 1 del registro. El usuario elige su rol (CLIENTE o GRUERO) y el
 * formulario en el frontend cambia según esa elección. Si es GRUERO,
 * el perfil queda creado con estadoCertificacion=PENDIENTE hasta que
 * suba sus documentos (módulo gruero) y un administrador los apruebe.
 *
 * Al registrarse, se le manda un correo de bienvenida con un enlace para
 * verificar su cuenta. La cuenta queda utilizable de inmediato (no se
 * bloquea el login por no estar verificada), pero el frontend puede avisar
 * que falta verificar.
 */
export async function registrarUsuario(datos: RegistroInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existente) {
    throw new AppError(409, 'Ya existe una cuenta con ese email');
  }

  const passwordHash = await bcrypt.hash(datos.password, 10);
  const tokenVerificacion = generarToken32();

  const usuario = await prisma.usuario.create({
    data: {
      email: datos.email,
      password: passwordHash,
      nombre: datos.nombre,
      telefono: datos.telefono,
      rol: datos.rol,
      tokenVerificacion,
      tokenVerificacionExpira: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48h
      ...(datos.rol === 'GRUERO'
        ? {
            grueroPerfil: {
              create: {
                tipoGrua: datos.tipoGrua,
                placa: datos.placa,
                direccion: datos.direccion,
                latitud: datos.latitud,
                longitud: datos.longitud,
                // Membresía mensual ($10 por defecto) declarada al registrarse;
                // queda PENDIENTE hasta que un admin confirme la referencia.
                membresias: {
                  create: {
                    referencia: datos.referenciaMembresia,
                  },
                },
              },
            },
          }
        : {}),
    },
    include: { grueroPerfil: true },
  });

  await enviarCorreoBienvenidaYVerificacion(usuario.email, usuario.nombre, tokenVerificacion);

  const token = generarToken({ id: usuario.id, rol: usuario.rol });
  return { token, usuario: serializarUsuario(usuario) };
}

export async function iniciarSesion(datos: LoginInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: datos.email },
    include: { grueroPerfil: true },
  });
  if (!usuario) throw new AppError(401, 'Credenciales inválidas');

  const passwordOk = await bcrypt.compare(datos.password, usuario.password);
  if (!passwordOk) throw new AppError(401, 'Credenciales inválidas');

  const token = generarToken({ id: usuario.id, rol: usuario.rol });
  return { token, usuario: serializarUsuario(usuario) };
}

export async function verificarEmail(token: string) {
  const usuario = await prisma.usuario.findUnique({ where: { tokenVerificacion: token } });
  if (!usuario || !usuario.tokenVerificacionExpira || usuario.tokenVerificacionExpira < new Date()) {
    throw new AppError(400, 'El enlace de verificación no es válido o ya venció.');
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { emailVerificado: true, tokenVerificacion: null, tokenVerificacionExpira: null },
  });
  return { ok: true };
}

export async function reenviarVerificacion(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  if (usuario.emailVerificado) throw new AppError(400, 'Tu cuenta ya está verificada.');

  const tokenVerificacion = generarToken32();
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { tokenVerificacion, tokenVerificacionExpira: new Date(Date.now() + 1000 * 60 * 60 * 48) },
  });

  await enviarCorreoBienvenidaYVerificacion(usuario.email, usuario.nombre, tokenVerificacion);
  return { ok: true };
}

/**
 * Por seguridad, siempre responde "ok" exista o no la cuenta — así no se
 * puede usar este endpoint para averiguar qué emails están registrados.
 */
export async function solicitarRecuperacion(datos: SolicitarRecuperacionInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (!usuario) return { ok: true };

  const tokenRecuperacion = generarToken32();
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tokenRecuperacion, tokenRecuperacionExpira: new Date(Date.now() + 1000 * 60 * 60) }, // 1h
  });

  await enviarCorreoRecuperacion(usuario.email, usuario.nombre, tokenRecuperacion);
  return { ok: true };
}

export async function restablecerPassword(datos: RestablecerPasswordInput) {
  const usuario = await prisma.usuario.findUnique({ where: { tokenRecuperacion: datos.token } });
  if (!usuario || !usuario.tokenRecuperacionExpira || usuario.tokenRecuperacionExpira < new Date()) {
    throw new AppError(400, 'El enlace de recuperación no es válido o ya venció.');
  }

  const passwordHash = await bcrypt.hash(datos.passwordNueva, 10);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { password: passwordHash, tokenRecuperacion: null, tokenRecuperacionExpira: null },
  });
  return { ok: true };
}
