import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { getIO } from '../../shared/socket/socket.js';
import * as pagoService from '../pago/pago.service.js';
import { listarActivos as listarGruerosActivosMapa } from '../gruero/gruero.service.js';
import type { CambiarCertificacionInput, ActualizarPagoMovilInput } from './admin.schema.js';

export { listarGruerosActivosMapa };

const infoUsuario = { select: { nombre: true, email: true, telefono: true } } as const;

/** Lista los grueros filtrados por estado de certificación. Por defecto, los que están EN_REVISION. */
export async function listarGrueros(estado?: 'PENDIENTE' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO') {
  return prisma.grueroPerfil.findMany({
    where: { estadoCertificacion: estado ?? 'EN_REVISION' },
    include: { usuario: infoUsuario, documentos: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function obtenerDetalleGruero(grueroPerfilId: string) {
  const perfil = await prisma.grueroPerfil.findUnique({
    where: { id: grueroPerfilId },
    include: { usuario: infoUsuario, documentos: true },
  });
  if (!perfil) throw new AppError(404, 'Perfil de gruero no encontrado');
  return perfil;
}

/**
 * Aprueba o rechaza la certificación. Si se rechaza, además se apaga
 * `activo` por si acaso ya estaba disponible en el mapa.
 */
export async function cambiarCertificacion(grueroPerfilId: string, datos: CambiarCertificacionInput) {
  const perfil = await prisma.grueroPerfil.findUnique({ where: { id: grueroPerfilId } });
  if (!perfil) throw new AppError(404, 'Perfil de gruero no encontrado');

  return prisma.grueroPerfil.update({
    where: { id: grueroPerfilId },
    data: {
      estadoCertificacion: datos.estado,
      ...(datos.estado === 'RECHAZADO' ? { activo: false } : {}),
    },
  });
}

/** Pagos móviles con referencia ya declarada, pendientes de que el admin los verifique. */
export async function listarPagosPendientes() {
  return prisma.pago.findMany({
    where: { metodo: 'PAGO_MOVIL', estado: 'PENDIENTE', referencia: { not: null } },
    include: {
      servicio: {
        include: {
          cliente: { select: { nombre: true, email: true, telefono: true } },
          gruero: { include: { usuario: { select: { nombre: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * El admin verifica la referencia contra su banco y aprueba o rechaza.
 * Al aprobar, el servicio pasa de PENDIENTE_PAGO a SOLICITADO y recién ahí
 * se le notifica al gruero elegido (por eso no lo sabía desde el principio).
 */
export async function confirmarPago(pagoId: string, aprobar: boolean) {
  const pago = await prisma.pago.findUnique({ where: { id: pagoId }, include: { servicio: true } });
  if (!pago) throw new AppError(404, 'Pago no encontrado');

  if (aprobar) {
    await prisma.pago.update({ where: { id: pagoId }, data: { estado: 'CONFIRMADO', confirmadoEn: new Date() } });
    const servicio = await prisma.servicio.update({
      where: { id: pago.servicioId },
      data: { estado: 'SOLICITADO' },
      include: { gruero: { include: { usuario: true } }, pago: true },
    });
    if (servicio.gruero) {
      getIO().to(`gruero:${servicio.gruero.usuarioId}`).emit('servicio:nuevo', servicio);
    }
    getIO().to(`servicio:${servicio.id}`).emit('servicio:actualizado', servicio);
    return servicio;
  }

  await prisma.pago.update({ where: { id: pagoId }, data: { estado: 'RECHAZADO' } });
  const servicio = await prisma.servicio.update({
    where: { id: pago.servicioId },
    data: { estado: 'CANCELADO' },
  });
  getIO().to(`servicio:${servicio.id}`).emit('servicio:actualizado', servicio);
  return servicio;
}

interface AcumuladorRendimiento {
  grueroPerfilId: string;
  nombre: string;
  placa: string;
  servicios: number;
  sumaLlegada: number;
  countLlegada: number;
  sumaRemolque: number;
  countRemolque: number;
  sumaTraslado: number;
  countTraslado: number;
  sumaEstrellas: number;
  countEstrellas: number;
}

/**
 * Rendimiento por gruero, calculado sobre servicios COMPLETADO: tiempo
 * promedio en llegar al cliente (asignado -> llegada), en enganchar/subir
 * el vehículo (llegada -> en_traslado) y en trasladarlo al destino
 * (en_traslado -> completado), más su calificación promedio.
 */
export async function obtenerRendimientoGrueros() {
  const servicios = await prisma.servicio.findMany({
    where: { estado: 'COMPLETADO' },
    include: { gruero: { include: { usuario: { select: { nombre: true } } } }, calificacion: true },
  });

  const acumulado = new Map<string, AcumuladorRendimiento>();

  for (const s of servicios) {
    if (!s.gruero) continue;
    const key = s.gruero.id;
    if (!acumulado.has(key)) {
      acumulado.set(key, {
        grueroPerfilId: key,
        nombre: s.gruero.usuario.nombre,
        placa: s.gruero.placa,
        servicios: 0,
        sumaLlegada: 0,
        countLlegada: 0,
        sumaRemolque: 0,
        countRemolque: 0,
        sumaTraslado: 0,
        countTraslado: 0,
        sumaEstrellas: 0,
        countEstrellas: 0,
      });
    }
    const acc = acumulado.get(key)!;
    acc.servicios += 1;

    if (s.horaAsignado && s.horaLlegada) {
      acc.sumaLlegada += (s.horaLlegada.getTime() - s.horaAsignado.getTime()) / 60000;
      acc.countLlegada += 1;
    }
    if (s.horaLlegada && s.horaEnTraslado) {
      acc.sumaRemolque += (s.horaEnTraslado.getTime() - s.horaLlegada.getTime()) / 60000;
      acc.countRemolque += 1;
    }
    if (s.horaEnTraslado && s.horaCompletado) {
      acc.sumaTraslado += (s.horaCompletado.getTime() - s.horaEnTraslado.getTime()) / 60000;
      acc.countTraslado += 1;
    }
    if (s.calificacion) {
      acc.sumaEstrellas += s.calificacion.estrellas;
      acc.countEstrellas += 1;
    }
  }

  return Array.from(acumulado.values())
    .map((a) => ({
      grueroPerfilId: a.grueroPerfilId,
      nombre: a.nombre,
      placa: a.placa,
      serviciosCompletados: a.servicios,
      tiempoPromedioLlegadaMin: a.countLlegada ? Number((a.sumaLlegada / a.countLlegada).toFixed(1)) : null,
      tiempoPromedioRemolqueMin: a.countRemolque ? Number((a.sumaRemolque / a.countRemolque).toFixed(1)) : null,
      tiempoPromedioTrasladoMin: a.countTraslado ? Number((a.sumaTraslado / a.countTraslado).toFixed(1)) : null,
      calificacionPromedio: a.countEstrellas ? Number((a.sumaEstrellas / a.countEstrellas).toFixed(1)) : null,
    }))
    .sort((a, b) => b.serviciosCompletados - a.serviciosCompletados);
}

/** Solicitudes de pago/retiro (de grueros o de clientes), pendientes de que el admin las pague. */
export async function listarSolicitudesPago() {
  return prisma.solicitudPago.findMany({
    where: { estado: 'PENDIENTE' },
    include: {
      gruero: { include: { usuario: { select: { nombre: true, email: true } } } },
      cliente: { select: { nombre: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * El admin marca una solicitud como pagada (la transferencia la hizo por
 * fuera de la app, con los datos que dio quien la pidió) — descuenta el
 * monto del saldo correspondiente (pendiente del gruero, o a favor del
 * cliente) y queda registrada con fecha y hora.
 */
export async function confirmarSolicitudPago(solicitudId: string) {
  const solicitud = await prisma.solicitudPago.findUnique({ where: { id: solicitudId } });
  if (!solicitud) throw new AppError(404, 'Solicitud no encontrada');
  if (solicitud.estado !== 'PENDIENTE') throw new AppError(400, 'Esta solicitud ya fue procesada.');

  const actualizarSaldo = solicitud.grueroPerfilId
    ? prisma.grueroPerfil.update({
        where: { id: solicitud.grueroPerfilId },
        data: { saldoPendientePago: { decrement: solicitud.monto } },
      })
    : prisma.usuario.update({
        where: { id: solicitud.clienteId! },
        data: { saldoAFavor: { decrement: solicitud.monto } },
      });

  const [, actualizada] = await prisma.$transaction([
    actualizarSaldo,
    prisma.solicitudPago.update({
      where: { id: solicitudId },
      data: { estado: 'CONFIRMADO', pagadoEn: new Date() },
    }),
  ]);

  return actualizada;
}

/**
 * Recalcula desde cero el saldo pendiente de TODOS los gruero, sumando lo
 * que corresponde de cada servicio COMPLETADO en Pago Móvil/Saldo y
 * restando lo que ya se les pagó (SolicitudPago CONFIRMADO). Útil para
 * corregir datos históricos si hubo un bug en el cálculo en su momento.
 */
export async function recalcularSaldosPendientes() {
  const grueros = await prisma.grueroPerfil.findMany({ select: { id: true } });

  for (const g of grueros) {
    const servicios = await prisma.servicio.findMany({
      where: {
        grueroPerfilId: g.id,
        estado: 'COMPLETADO',
        pago: { metodo: { in: ['PAGO_MOVIL', 'SALDO'] } },
      },
      include: { pago: true },
    });
    const totalGanado = servicios.reduce((acc: number, s: (typeof servicios)[number]) => acc + (s.pago?.monto ?? 0), 0);

    const pagado = await prisma.solicitudPago.aggregate({
      where: { grueroPerfilId: g.id, estado: 'CONFIRMADO' },
      _sum: { monto: true },
    });

    const nuevoSaldo = Number(Math.max(0, totalGanado - (pagado._sum.monto ?? 0)).toFixed(2));
    await prisma.grueroPerfil.update({ where: { id: g.id }, data: { saldoPendientePago: nuevoSaldo } });
  }

  return { ok: true, gruerosActualizados: grueros.length };
}

/** Datos de pago móvil de la app, editables por el admin (ver módulo pago para el lado del cliente). */
export async function obtenerConfigPagoMovil() {
  return pagoService.obtenerDatosPagoMovil();
}

export async function actualizarConfigPagoMovil(datos: ActualizarPagoMovilInput) {
  return pagoService.actualizarDatosPagoMovil(datos);
}

/** Membresías mensuales de gruero con referencia declarada, pendientes de verificar. */
export async function listarMembresiasPendientes() {
  return prisma.membresia.findMany({
    where: { estado: 'PENDIENTE', referencia: { not: null } },
    include: { gruero: { include: { usuario: { select: { nombre: true, email: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function confirmarMembresia(membresiaId: string, aprobar: boolean) {
  const membresia = await prisma.membresia.findUnique({ where: { id: membresiaId } });
  if (!membresia) throw new AppError(404, 'Membresía no encontrada');

  return prisma.membresia.update({
    where: { id: membresiaId },
    data: aprobar ? { estado: 'CONFIRMADO', confirmadoEn: new Date() } : { estado: 'RECHAZADO' },
  });
}

/**
 * Movimientos confirmados para el módulo de movimientos del admin: pagos de
 * servicios (efectivo/pago móvil/saldo) y membresías de gruero, unificados
 * y ordenados por fecha — cada uno con su tipo, usuario, monto y fecha/hora.
 */
export async function listarMovimientos() {
  const [pagos, membresias, solicitudesPagadas] = await Promise.all([
    prisma.pago.findMany({
      where: { estado: 'CONFIRMADO' },
      include: {
        servicio: {
          include: {
            cliente: { select: { nombre: true } },
            gruero: { select: { tipoGrua: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.membresia.findMany({
      where: { estado: 'CONFIRMADO' },
      include: { gruero: { include: { usuario: { select: { nombre: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.solicitudPago.findMany({
      where: { estado: 'CONFIRMADO' },
      include: {
        gruero: { include: { usuario: { select: { nombre: true } } } },
        cliente: { select: { nombre: true } },
      },
      orderBy: { pagadoEn: 'desc' },
      take: 100,
    }),
  ]);

  const etiquetaMetodo: Record<string, string> = { EFECTIVO: 'Efectivo', PAGO_MOVIL: 'Pago Móvil', SALDO: 'Saldo' };

  const movimientosLiquidacion = solicitudesPagadas.map((l: (typeof solicitudesPagadas)[number]) => ({
    id: l.id,
    tipo: 'PAGO_A_GRUERO' as const,
    descripcion: l.grueroPerfilId ? 'Pago a gruero (solicitud de pago)' : 'Retiro de saldo (cliente)',
    usuario: l.grueroPerfilId ? l.gruero!.usuario.nombre : l.cliente!.nombre,
    monto: l.monto,
    fecha: (l.pagadoEn ?? l.createdAt).toISOString(),
  }));

  const movimientosPago = pagos.map((p: (typeof pagos)[number]) => ({
    id: p.id,
    tipo: 'PAGO_SERVICIO' as const,
    descripcion: `Servicio de grúa (${p.servicio.gruero?.tipoGrua ?? 'N/D'}) · ${etiquetaMetodo[p.metodo] ?? p.metodo}`,
    usuario: p.servicio.cliente.nombre,
    monto: Number((p.monto + (p.comisionPlataforma ?? 0)).toFixed(2)),
    fecha: (p.confirmadoEn ?? p.declaradoPorGrueroEn ?? p.createdAt).toISOString(),
  }));

  const movimientosMembresia = membresias.map((m: (typeof membresias)[number]) => ({
    id: m.id,
    tipo: 'MEMBRESIA_GRUERO' as const,
    descripcion: 'Membresía Gruero',
    usuario: m.gruero.usuario.nombre,
    monto: m.monto,
    fecha: (m.confirmadoEn ?? m.createdAt).toISOString(),
  }));

  return [...movimientosPago, ...movimientosMembresia, ...movimientosLiquidacion].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
}

/**
 * Resumen de todos los servicios para el admin: quién lo pidió, quién lo
 * hizo, de dónde a dónde, y sus tiempos (inicio = cuando el gruero fue
 * asignado, fin = cuando se completó).
 */
export async function listarServicios() {
  return prisma.servicio.findMany({
    include: {
      cliente: { select: { nombre: true, email: true } },
      gruero: { include: { usuario: { select: { nombre: true } } } },
      pago: { select: { metodo: true, estado: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
