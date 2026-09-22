import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { getIO } from '../../shared/socket/socket.js';
import { calcularDesgloseTarifa } from '../../shared/lib/pricing.js';
import type { AuthPayload } from '../../shared/middleware/auth.middleware.js';
import type { CrearServicioInput, CambiarEstadoInput, CalificarInput } from './servicio.schema.js';

type Rol = AuthPayload['rol'];

const INCLUYE_GRUERO = { gruero: { include: { usuario: true } }, pago: true, calificacion: true } as const;

/**
 * El cliente crea la solicitud dirigida a un gruero específico (ya no hay
 * pool abierto). Si paga en efectivo o con saldo, el gruero se entera de
 * inmediato (estado SOLICITADO). Si paga por pago móvil, queda
 * PENDIENTE_PAGO hasta que un admin confirme la referencia declarada.
 *
 * Precio: la comisión de la plataforma (1.5%) se SUMA a la tarifa base — el
 * cliente paga base+comisión (el "total"), el gruero se queda con la base,
 * y la comisión es lo que gana la app. `tarifaEstimada` en el Servicio
 * siempre guarda el TOTAL (lo que el cliente ve y paga); `pago.monto`
 * guarda la BASE (lo que le corresponde al gruero); `pago.comisionPlataforma`
 * se calcula desde el momento de la creación, para los tres métodos de pago.
 */
export async function crearServicio(clienteId: string, datos: CrearServicioInput) {
  const perfilGruero = await prisma.grueroPerfil.findUnique({ where: { id: datos.grueroPerfilId } });
  if (!perfilGruero || !perfilGruero.activo || perfilGruero.estadoCertificacion !== 'APROBADO') {
    throw new AppError(400, 'Ese gruero ya no está disponible, elige otro.');
  }

  const { base, comision, total } = calcularDesgloseTarifa(datos.distanciaKm ?? 0);

  if (datos.metodoPago === 'SALDO') {
    const cliente = await prisma.usuario.findUnique({ where: { id: clienteId } });
    if (!cliente || cliente.saldoAFavor < total) {
      throw new AppError(400, 'Tu saldo a favor no alcanza para pagar este servicio. Usa efectivo o pago móvil.');
    }
  }

  const estadoInicial = datos.metodoPago === 'PAGO_MOVIL' ? 'PENDIENTE_PAGO' : 'SOLICITADO';
  const vuelto =
    datos.metodoPago === 'EFECTIVO' && datos.montoEntregado != null
      ? Number(Math.max(0, datos.montoEntregado - total).toFixed(2))
      : null;

  const datosPago = {
    metodo: datos.metodoPago,
    monto: base,
    comisionPlataforma: comision,
    montoEntregado: datos.montoEntregado ?? null,
    vuelto,
    referencia: datos.referenciaPago ?? null,
    // El saldo ya es dinero de la plataforma: se confirma solo, sin pasar
    // por el gruero ni por revisión del admin.
    ...(datos.metodoPago === 'SALDO' ? { estado: 'CONFIRMADO' as const, confirmadoEn: new Date() } : {}),
  };

  const servicio = await (async () => {
    if (datos.metodoPago === 'SALDO') {
      const [, creado] = await prisma.$transaction([
        prisma.usuario.update({ where: { id: clienteId }, data: { saldoAFavor: { decrement: total } } }),
        prisma.servicio.create({
          data: {
            clienteId,
            grueroPerfilId: perfilGruero.id,
            origenLat: datos.origenLat,
            origenLng: datos.origenLng,
            origenDireccion: datos.origenDireccion,
            destinoLat: datos.destinoLat,
            destinoLng: datos.destinoLng,
            destinoDireccion: datos.destinoDireccion,
            distanciaKm: datos.distanciaKm,
            duracionMin: datos.duracionMin,
            tarifaEstimada: total,
            estado: estadoInicial,
            pago: { create: datosPago },
          },
          include: INCLUYE_GRUERO,
        }),
      ]);
      return creado;
    }

    return prisma.servicio.create({
      data: {
        clienteId,
        grueroPerfilId: perfilGruero.id,
        origenLat: datos.origenLat,
        origenLng: datos.origenLng,
        origenDireccion: datos.origenDireccion,
        destinoLat: datos.destinoLat,
        destinoLng: datos.destinoLng,
        destinoDireccion: datos.destinoDireccion,
        distanciaKm: datos.distanciaKm,
        duracionMin: datos.duracionMin,
        tarifaEstimada: total,
        estado: estadoInicial,
        pago: { create: datosPago },
      },
      include: INCLUYE_GRUERO,
    });
  })();

  if (estadoInicial === 'SOLICITADO') {
    getIO().to(`gruero:${perfilGruero.usuarioId}`).emit('servicio:nuevo', servicio);
  }

  return servicio;
}

/** Lo que ve el gruero: solicitudes dirigidas a él, pendientes de aceptar/rechazar. */
export async function listarDisponibles(usuarioId: string) {
  const perfil = await prisma.grueroPerfil.findUnique({ where: { usuarioId } });
  if (!perfil) throw new AppError(404, 'Perfil de gruero no encontrado');

  return prisma.servicio.findMany({
    where: { estado: 'SOLICITADO', grueroPerfilId: perfil.id },
    include: { pago: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function obtenerServicio(servicioId: string, usuarioId: string, rol: Rol) {
  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    include: INCLUYE_GRUERO,
  });
  if (!servicio) throw new AppError(404, 'Servicio no encontrado');

  const esElCliente = rol === 'CLIENTE' && servicio.clienteId === usuarioId;
  const esElGruero = rol === 'GRUERO' && servicio.gruero?.usuarioId === usuarioId;
  if (!esElCliente && !esElGruero) {
    throw new AppError(403, 'No tienes acceso a este servicio');
  }
  return servicio;
}

/** Usado por el socket (chat, ubicación) para verificar acceso sin lanzar excepción. */
export async function usuarioPerteneceAServicio(servicioId: string, usuarioId: string): Promise<boolean> {
  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    include: { gruero: true },
  });
  if (!servicio) return false;
  return servicio.clienteId === usuarioId || servicio.gruero?.usuarioId === usuarioId;
}

export async function misServicios(usuarioId: string, rol: Rol) {
  if (rol === 'CLIENTE') {
    return prisma.servicio.findMany({
      where: { clienteId: usuarioId },
      include: { pago: true, calificacion: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  const perfil = await prisma.grueroPerfil.findUnique({ where: { usuarioId } });
  if (!perfil) throw new AppError(404, 'Perfil de gruero no encontrado');
  return prisma.servicio.findMany({
    where: { grueroPerfilId: perfil.id },
    include: { pago: true, calificacion: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * El gruero acepta una solicitud dirigida a él (estado SOLICITADO -> ASIGNADO).
 * updateMany con el gruero y estado actual en el `where` evita condiciones de
 * carrera (aunque aquí ya es 1 a 1, protege contra doble clic / doble tab).
 */
export async function aceptarServicio(servicioId: string, usuarioId: string) {
  const perfil = await prisma.grueroPerfil.findUnique({ where: { usuarioId } });
  if (!perfil) throw new AppError(404, 'Perfil de gruero no encontrado');

  const resultado = await prisma.servicio.updateMany({
    where: { id: servicioId, estado: 'SOLICITADO', grueroPerfilId: perfil.id },
    data: { estado: 'ASIGNADO', horaAsignado: new Date() },
  });
  if (resultado.count === 0) {
    throw new AppError(409, 'Esta solicitud ya no está disponible.');
  }

  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId }, include: INCLUYE_GRUERO });
  getIO().to(`servicio:${servicioId}`).emit('servicio:actualizado', servicio);
  return servicio;
}

const CAMPO_HORA: Partial<Record<CambiarEstadoInput['estado'], 'horaEnCamino' | 'horaLlegada' | 'horaCompletado'>> = {
  EN_CAMINO: 'horaEnCamino',
  LLEGADA: 'horaLlegada',
  COMPLETADO: 'horaCompletado',
};

/**
 * Reglas: solo el gruero puede avanzar el flujo; CANCELADO lo puede marcar
 * cualquiera de las dos partes (incluido el gruero rechazando una SOLICITADO).
 * Al llegar a COMPLETADO:
 * - Efectivo: se confirma el pago (la comisión ya se calculó al crear el
 *   servicio) y, si hubo vuelto, se acredita como saldo a favor del cliente.
 *   El gruero ya tiene el dinero en mano (base + comisión); le queda
 *   pendiente pagarle esa comisión a la plataforma por fuera de la app.
 * - Pago Móvil / Saldo: el dinero ya lo tiene la plataforma (el cliente
 *   transfirió o descontó su saldo), así que aquí se le acredita al gruero
 *   su parte (la base, sin la comisión) como saldo pendiente de pago —
 *   el admin se lo liquida manualmente desde su panel.
 * Cada transición deja su marca de tiempo (para medir rendimiento del gruero).
 */
export async function cambiarEstado(
  servicioId: string,
  usuarioId: string,
  rol: Rol,
  datos: CambiarEstadoInput
) {
  const servicio = await obtenerServicio(servicioId, usuarioId, rol); // valida acceso y existencia

  const soloGruero: CambiarEstadoInput['estado'][] = ['EN_CAMINO', 'LLEGADA', 'COMPLETADO'];
  if (soloGruero.includes(datos.estado) && rol !== 'GRUERO') {
    throw new AppError(403, 'Solo el gruero puede actualizar este estado');
  }

  // Guardia contra reprocesar: se compara con el estado del SERVICIO (no
  // el del pago), porque en Pago Móvil el pago ya queda CONFIRMADO desde
  // que el admin aprueba la referencia — mucho antes de llegar aquí. Si
  // guardáramos contra pago.estado, este bloque nunca se ejecutaría para
  // Pago Móvil/Saldo y jamás se acreditaría el saldo pendiente del gruero.
  if (datos.estado === 'COMPLETADO' && servicio.estado !== 'COMPLETADO' && servicio.pago) {
    if (servicio.pago.metodo === 'EFECTIVO') {
      await prisma.pago.update({
        where: { id: servicio.pago.id },
        data: { estado: 'CONFIRMADO', declaradoPorGrueroEn: new Date() },
      });
      if (servicio.pago.vuelto && servicio.pago.vuelto > 0) {
        await prisma.usuario.update({
          where: { id: servicio.clienteId },
          data: { saldoAFavor: { increment: servicio.pago.vuelto } },
        });
      }
    } else if (servicio.grueroPerfilId) {
      // Pago Móvil o Saldo: el dinero ya está en la plataforma; se le
      // acredita al gruero su parte (la base) como pendiente de liquidar.
      await prisma.grueroPerfil.update({
        where: { id: servicio.grueroPerfilId },
        data: { saldoPendientePago: { increment: servicio.pago.monto } },
      });
    }
  }

  const campoHora = CAMPO_HORA[datos.estado];

  const actualizado = await prisma.servicio.update({
    where: { id: servicioId },
    data: { estado: datos.estado, ...(campoHora ? { [campoHora]: new Date() } : {}) },
    include: INCLUYE_GRUERO,
  });

  getIO().to(`servicio:${servicioId}`).emit('servicio:actualizado', actualizado);
  return actualizado;
}

/**
 * Paso dedicado para pasar a EN_TRASLADO: acepta una foto opcional del
 * vehículo ya enganchado / montado en la plataforma, como evidencia. Queda
 * separado de cambiarEstado porque este endpoint recibe multipart/form-data.
 */
export async function iniciarTraslado(servicioId: string, usuarioId: string, fotoUrl: string | null) {
  const servicio = await obtenerServicio(servicioId, usuarioId, 'GRUERO');
  if (servicio.estado !== 'LLEGADA') {
    throw new AppError(400, 'Primero debes notificar tu llegada al punto del cliente.');
  }

  const actualizado = await prisma.servicio.update({
    where: { id: servicioId },
    data: {
      estado: 'EN_TRASLADO',
      horaEnTraslado: new Date(),
      ...(fotoUrl ? { fotoEnganche: fotoUrl } : {}),
    },
    include: INCLUYE_GRUERO,
  });

  getIO().to(`servicio:${servicioId}`).emit('servicio:actualizado', actualizado);
  return actualizado;
}

/** El cliente califica el servicio una vez completado (una sola vez). */
export async function calificarServicio(servicioId: string, clienteId: string, datos: CalificarInput) {
  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId }, include: { calificacion: true } });
  if (!servicio || servicio.clienteId !== clienteId) throw new AppError(404, 'Servicio no encontrado');
  if (servicio.estado !== 'COMPLETADO') throw new AppError(400, 'Solo puedes calificar un servicio completado');
  if (servicio.calificacion) throw new AppError(409, 'Ya calificaste este servicio');
  if (!servicio.grueroPerfilId) throw new AppError(400, 'Este servicio no tiene gruero asignado');

  return prisma.calificacion.create({
    data: {
      servicioId,
      grueroPerfilId: servicio.grueroPerfilId,
      estrellas: datos.estrellas,
      comentario: datos.comentario,
    },
  });
}

/** Historial de mensajes del chat de un servicio (cliente y gruero involucrados solamente). */
export async function listarMensajes(servicioId: string, usuarioId: string, rol: Rol) {
  await obtenerServicio(servicioId, usuarioId, rol); // valida acceso
  return prisma.mensaje.findMany({
    where: { servicioId },
    orderBy: { createdAt: 'asc' },
  });
}

/** Usado por el socket al recibir 'chat:enviar' — persiste y devuelve el mensaje creado. */
export async function guardarMensaje(servicioId: string, autorId: string, texto: string) {
  return prisma.mensaje.create({ data: { servicioId, autorId, texto } });
}
