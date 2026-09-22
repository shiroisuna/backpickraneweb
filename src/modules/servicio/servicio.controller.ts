import type { Request, Response, NextFunction } from 'express';
import { crearServicioSchema, cambiarEstadoSchema, calificarSchema } from './servicio.schema.js';
import * as servicioService from './servicio.service.js';

export async function crear(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = crearServicioSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const servicio = await servicioService.crearServicio(req.user!.id, parsed.data);
    res.status(201).json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function disponibles(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await servicioService.listarDisponibles(req.user!.id));
  } catch (err) {
    next(err);
  }
}

export async function obtener(req: Request, res: Response, next: NextFunction) {
  try {
    const servicio = await servicioService.obtenerServicio(req.params.id, req.user!.id, req.user!.rol);
    res.json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function misServicios(req: Request, res: Response, next: NextFunction) {
  try {
    const servicios = await servicioService.misServicios(req.user!.id, req.user!.rol);
    res.json(servicios);
  } catch (err) {
    next(err);
  }
}

export async function aceptar(req: Request, res: Response, next: NextFunction) {
  try {
    const servicio = await servicioService.aceptarServicio(req.params.id, req.user!.id);
    res.json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function cambiarEstado(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = cambiarEstadoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const servicio = await servicioService.cambiarEstado(
      req.params.id,
      req.user!.id,
      req.user!.rol,
      parsed.data
    );
    res.json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function iniciarTraslado(req: Request, res: Response, next: NextFunction) {
  try {
    const fotoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const servicio = await servicioService.iniciarTraslado(req.params.id, req.user!.id, fotoUrl);
    res.json(servicio);
  } catch (err) {
    next(err);
  }
}

export async function calificar(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = calificarSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const calificacion = await servicioService.calificarServicio(req.params.id, req.user!.id, parsed.data);
    res.status(201).json(calificacion);
  } catch (err) {
    next(err);
  }
}

export async function listarMensajes(req: Request, res: Response, next: NextFunction) {
  try {
    const mensajes = await servicioService.listarMensajes(req.params.id, req.user!.id, req.user!.rol);
    res.json(mensajes);
  } catch (err) {
    next(err);
  }
}
