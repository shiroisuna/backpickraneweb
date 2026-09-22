import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { tiposDocumentoValidos, type TipoDocumento, type ActivoInput, type SolicitarPagoInput } from './gruero.schema.js';

async function obtenerPerfilPorUsuario(usuarioId: string) {
  const perfil = await prisma.grueroPerfil.findUnique({ where: { usuarioId } });
  if (!perfil) throw new AppError(404, 'Perfil de gruero no encontrado');
  return perfil;
}

export async function obtenerPerfilConDocumentos(usuarioId: string) {
  const perfil = await prisma.grueroPerfil.findUnique({
    where: { usuarioId },
    include: { documentos: true },
  });
  if (!perfil) throw new AppError(404, 'Perfil no encontrado');
  return perfil;
}

/**
 * Segundo paso de la certificación. Sube un documento y, cuando ya
 * están los 4 tipos requeridos, pasa el perfil a EN_REVISION para que
 * un administrador lo apruebe.
 */
export async function subirDocumento(usuarioId: string, tipo: TipoDocumento, archivoUrl: string) {
  const perfil = await obtenerPerfilPorUsuario(usuarioId);

  const documento = await prisma.documento.create({
    data: { grueroPerfilId: perfil.id, tipo, archivoUrl },
  });

  const documentos = await prisma.documento.findMany({ where: { grueroPerfilId: perfil.id } });
  const tiposSubidos = new Set(documentos.map((d: { tipo: TipoDocumento }) => d.tipo));
  const completo = tiposDocumentoValidos.every((t) => tiposSubidos.has(t));

  if (completo && perfil.estadoCertificacion === 'PENDIENTE') {
    await prisma.grueroPerfil.update({
      where: { id: perfil.id },
      data: { estadoCertificacion: 'EN_REVISION' },
    });
  }

  return documento;
}

/**
 * El gruero se marca disponible/no disponible. Solo puede activarse
 * si ya fue APROBADO. La ubicación inicial también sirve para mostrarlo
 * en el mapa antes de que empiece a mandar updates por socket.
 */
export async function actualizarDisponibilidad(usuarioId: string, datos: ActivoInput) {
  const perfil = await obtenerPerfilPorUsuario(usuarioId);

  if (datos.activo && perfil.estadoCertificacion !== 'APROBADO') {
    throw new AppError(403, 'Tu certificación aún no ha sido aprobada');
  }

  return prisma.grueroPerfil.update({
    where: { id: perfil.id },
    data: {
      activo: datos.activo,
      ...(datos.lat !== undefined ? { ultimaLat: datos.lat } : {}),
      ...(datos.lng !== undefined ? { ultimaLng: datos.lng } : {}),
      ultimaActualizacion: new Date(),
    },
  });
}

/** Lo que ve el cliente al elegir gruero: los activos y aprobados, con su foto de grúa si la subieron. */
export async function listarActivos() {
  return prisma.grueroPerfil.findMany({
    where: { activo: true, estadoCertificacion: 'APROBADO' },
    include: {
      usuario: { select: { nombre: true, telefono: true } },
      documentos: { where: { tipo: 'FOTO_GRUA' }, take: 1 },
    },
  });
}

/**
 * El gruero pide que le paguen su saldo pendiente (o parte de él), con sus
 * propios datos de Pago Móvil para recibirlo. Queda pendiente hasta que el
 * admin la marque como pagada. No se puede pedir más de lo que se tiene
 * pendiente, ni hacer una segunda solicitud mientras haya una sin resolver.
 */
export async function solicitarPago(usuarioId: string, datos: SolicitarPagoInput) {
  const perfil = await obtenerPerfilPorUsuario(usuarioId);

  if (datos.monto > perfil.saldoPendientePago) {
    throw new AppError(400, 'No puedes solicitar más de tu saldo pendiente.');
  }

  const yaTienePendiente = await prisma.solicitudPago.findFirst({
    where: { grueroPerfilId: perfil.id, estado: 'PENDIENTE' },
  });
  if (yaTienePendiente) {
    throw new AppError(409, 'Ya tienes una solicitud de pago pendiente de que el admin la procese.');
  }

  return prisma.solicitudPago.create({
    data: {
      grueroPerfilId: perfil.id,
      monto: datos.monto,
      banco: datos.banco,
      telefono: datos.telefono,
      cedulaORif: datos.cedulaORif,
    },
  });
}
