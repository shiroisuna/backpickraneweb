import type { Request, Response, NextFunction } from 'express';
import { actualizarPerfilSchema, cambiarPasswordSchema, solicitarRetiroSchema } from './perfil.schema.js';
import * as perfilService from './perfil.service.js';

export async function obtener(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await perfilService.obtenerPerfil(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = actualizarPerfilSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.json(await perfilService.actualizarPerfil(req.user!.id, parsed.data));
  } catch (err) {
    next(err);
  }
}

export async function subirFoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo (campo "archivo")' });

    res.json(await perfilService.subirFotoPerfil(req.user!.id, `/uploads/${req.file.filename}`));
  } catch (err) {
    next(err);
  }
}

export async function cambiarPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = cambiarPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.json(await perfilService.cambiarPassword(req.user!.id, parsed.data));
  } catch (err) {
    next(err);
  }
}

export async function solicitarRetiro(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = solicitarRetiroSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const solicitud = await perfilService.solicitarRetiro(req.user!.id, parsed.data);
    res.status(201).json(solicitud);
  } catch (err) {
    next(err);
  }
}
