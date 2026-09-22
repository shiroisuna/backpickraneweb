import type { Request, Response, NextFunction } from 'express';
import { activoSchema, tiposDocumentoValidos, solicitarPagoSchema } from './gruero.schema.js';
import * as grueroService from './gruero.service.js';

export async function obtenerPerfil(req: Request, res: Response, next: NextFunction) {
  try {
    const perfil = await grueroService.obtenerPerfilConDocumentos(req.user!.id);
    res.json(perfil);
  } catch (err) {
    next(err);
  }
}

export async function subirDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const tipo = req.body.tipo;
    if (!tiposDocumentoValidos.includes(tipo)) {
      return res.status(400).json({ error: `tipo debe ser uno de: ${tiposDocumentoValidos.join(', ')}` });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Falta el archivo (campo "archivo")' });
    }

    const documento = await grueroService.subirDocumento(
      req.user!.id,
      tipo,
      `/uploads/${req.file.filename}`
    );
    res.status(201).json(documento);
  } catch (err) {
    next(err);
  }
}

export async function actualizarDisponibilidad(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = activoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const actualizado = await grueroService.actualizarDisponibilidad(req.user!.id, parsed.data);
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
}

export async function listarActivos(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await grueroService.listarActivos());
  } catch (err) {
    next(err);
  }
}

export async function solicitarPago(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = solicitarPagoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const solicitud = await grueroService.solicitarPago(req.user!.id, parsed.data);
    res.status(201).json(solicitud);
  } catch (err) {
    next(err);
  }
}
