import type { Request, Response, NextFunction } from 'express';
import {
  filtroEstadoSchema,
  cambiarCertificacionSchema,
  confirmarPagoSchema,
  actualizarPagoMovilSchema,
  confirmarMembresiaSchema,
} from './admin.schema.js';
import * as adminService from './admin.service.js';

export async function listarGrueros(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = filtroEstadoSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const grueros = await adminService.listarGrueros(parsed.data.estado);
    res.json(grueros);
  } catch (err) {
    next(err);
  }
}

export async function obtenerDetalleGruero(req: Request, res: Response, next: NextFunction) {
  try {
    const perfil = await adminService.obtenerDetalleGruero(req.params.id);
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}

export async function cambiarCertificacion(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = cambiarCertificacionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const perfil = await adminService.cambiarCertificacion(req.params.id, parsed.data);
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}

export async function listarPagosPendientes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listarPagosPendientes());
  } catch (err) {
    next(err);
  }
}

export async function confirmarPago(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = confirmarPagoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const servicio = await adminService.confirmarPago(req.params.id, parsed.data.aprobar);
    res.json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function rendimientoGrueros(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.obtenerRendimientoGrueros());
  } catch (err) {
    next(err);
  }
}

export async function obtenerConfigPagoMovil(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.obtenerConfigPagoMovil());
  } catch (err) {
    next(err);
  }
}

export async function actualizarConfigPagoMovil(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = actualizarPagoMovilSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.json(await adminService.actualizarConfigPagoMovil(parsed.data));
  } catch (err) {
    next(err);
  }
}

export async function listarMembresiasPendientes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listarMembresiasPendientes());
  } catch (err) {
    next(err);
  }
}

export async function confirmarMembresia(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = confirmarMembresiaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.json(await adminService.confirmarMembresia(req.params.id, parsed.data.aprobar));
  } catch (err) {
    next(err);
  }
}

export async function listarMovimientos(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listarMovimientos());
  } catch (err) {
    next(err);
  }
}

export async function listarServicios(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listarServicios());
  } catch (err) {
    next(err);
  }
}

export async function listarGruerosActivosMapa(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listarGruerosActivosMapa());
  } catch (err) {
    next(err);
  }
}

export async function listarSaldosPendientes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listarSolicitudesPago());
  } catch (err) {
    next(err);
  }
}

export async function liquidarGruero(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.confirmarSolicitudPago(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function recalcularSaldosPendientes(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.recalcularSaldosPendientes());
  } catch (err) {
    next(err);
  }
}
