import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware.js';
import { upload } from '../../shared/lib/upload.js';
import * as servicioController from './servicio.controller.js';

export const servicioRouter = Router();

servicioRouter.use(requireAuth);

// Rutas específicas ANTES de '/:id' para que Express no las confunda con un id.
servicioRouter.post('/', requireRole('CLIENTE'), servicioController.crear);
servicioRouter.get('/mis-servicios', servicioController.misServicios);
servicioRouter.get('/disponibles', requireRole('GRUERO'), servicioController.disponibles);

servicioRouter.get('/:id', servicioController.obtener);
servicioRouter.post('/:id/aceptar', requireRole('GRUERO'), servicioController.aceptar);
servicioRouter.patch('/:id/estado', servicioController.cambiarEstado);
servicioRouter.post(
  '/:id/traslado',
  requireRole('GRUERO'),
  upload.single('archivo'),
  servicioController.iniciarTraslado
);
servicioRouter.post('/:id/calificar', requireRole('CLIENTE'), servicioController.calificar);
servicioRouter.get('/:id/mensajes', servicioController.listarMensajes);
