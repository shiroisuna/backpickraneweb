import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware.js';
import { upload } from '../../shared/lib/upload.js';
import * as grueroController from './gruero.controller.js';

export const grueroRouter = Router();

grueroRouter.use(requireAuth, requireRole('GRUERO'));

grueroRouter.get('/perfil', grueroController.obtenerPerfil);
grueroRouter.post('/documentos', upload.single('archivo'), grueroController.subirDocumento);
grueroRouter.patch('/activo', grueroController.actualizarDisponibilidad);
grueroRouter.post('/solicitar-pago', grueroController.solicitarPago);
