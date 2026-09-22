import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import * as pagoService from './pago.service.js';

export const pagoRouter = Router();

pagoRouter.use(requireAuth);

/**
 * Datos de pago móvil de LA APP (no del gruero ni del cliente) — el cliente
 * transfiere aquí y luego declara el número de referencia al crear su
 * solicitud. Editables por el admin (ver /admin/pago-movil); si nunca se
 * han configurado, caen a las variables de entorno.
 */
pagoRouter.get('/datos-pago-movil', async (_req, res, next) => {
  try {
    res.json(await pagoService.obtenerDatosPagoMovil());
  } catch (err) {
    next(err);
  }
});
