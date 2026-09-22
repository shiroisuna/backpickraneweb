import type { Request, Response, NextFunction } from 'express';
import { registroSchema, loginSchema, solicitarRecuperacionSchema, restablecerPasswordSchema } from './auth.schema.js';
import {
  registrarUsuario,
  iniciarSesion,
  verificarEmail,
  reenviarVerificacion,
  solicitarRecuperacion,
  restablecerPassword,
} from './auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registroSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const resultado = await registrarUsuario(parsed.data);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const resultado = await iniciarSesion(parsed.data);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function verificar(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await verificarEmail(req.params.token));
  } catch (err) {
    next(err);
  }
}

export async function reenviarVerificacionCtrl(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await reenviarVerificacion(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function olvidePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = solicitarRecuperacionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.json(await solicitarRecuperacion(parsed.data));
  } catch (err) {
    next(err);
  }
}

export async function restablecer(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = restablecerPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    res.json(await restablecerPassword(parsed.data));
  } catch (err) {
    next(err);
  }
}
