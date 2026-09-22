import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware.js';
import * as adminController from './admin.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/grueros', adminController.listarGrueros);
adminRouter.get('/grueros/:id', adminController.obtenerDetalleGruero);
adminRouter.patch('/grueros/:id/certificacion', adminController.cambiarCertificacion);

adminRouter.get('/pagos', adminController.listarPagosPendientes);
adminRouter.patch('/pagos/:id/confirmar', adminController.confirmarPago);

adminRouter.get('/rendimiento', adminController.rendimientoGrueros);

adminRouter.get('/pago-movil', adminController.obtenerConfigPagoMovil);
adminRouter.patch('/pago-movil', adminController.actualizarConfigPagoMovil);

adminRouter.get('/membresias', adminController.listarMembresiasPendientes);
adminRouter.patch('/membresias/:id/confirmar', adminController.confirmarMembresia);

adminRouter.get('/movimientos', adminController.listarMovimientos);

adminRouter.get('/servicios', adminController.listarServicios);

adminRouter.get('/grueros-activos', adminController.listarGruerosActivosMapa);

adminRouter.get('/saldos-pendientes', adminController.listarSaldosPendientes);
adminRouter.post('/saldos-pendientes/:id/liquidar', adminController.liquidarGruero);
adminRouter.post('/saldos-pendientes/recalcular', adminController.recalcularSaldosPendientes);
