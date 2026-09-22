import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/verificar/:token', authController.verificar);
authRouter.post('/reenviar-verificacion', requireAuth, authController.reenviarVerificacionCtrl);
authRouter.post('/olvide-password', authController.olvidePassword);
authRouter.post('/restablecer-password', authController.restablecer);
