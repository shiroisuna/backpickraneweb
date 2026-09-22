import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware.js';
import * as grueroController from './gruero.controller.js';

export const grueroClienteRouter = Router();

grueroClienteRouter.use(requireAuth, requireRole('CLIENTE'));

grueroClienteRouter.get('/activos', grueroController.listarActivos);
