import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import { upload } from '../../shared/lib/upload.js';
import * as perfilController from './perfil.controller.js';

export const perfilRouter = Router();

perfilRouter.use(requireAuth);

perfilRouter.get('/', perfilController.obtener);
perfilRouter.patch('/', perfilController.actualizar);
perfilRouter.post('/foto', upload.single('archivo'), perfilController.subirFoto);
perfilRouter.patch('/password', perfilController.cambiarPassword);
perfilRouter.post('/solicitar-retiro', perfilController.solicitarRetiro);
