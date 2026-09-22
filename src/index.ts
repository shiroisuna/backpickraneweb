import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { createServer } from 'node:http';
import { authRouter } from './modules/auth/auth.routes.js';
import { grueroRouter } from './modules/gruero/gruero.routes.js';
import { grueroClienteRouter } from './modules/gruero/gruero-cliente.routes.js';
import { servicioRouter } from './modules/servicio/servicio.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { pagoRouter } from './modules/pago/pago.routes.js';
import { perfilRouter } from './modules/perfil/perfil.routes.js';
import { errorHandler } from './shared/middleware/error.middleware.js';
import { initSocket } from './shared/socket/socket.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve('src/uploads')));

app.use('/auth', authRouter);
app.use('/gruero', grueroRouter);
app.use('/grueros', grueroClienteRouter);
app.use('/servicio', servicioRouter);
app.use('/admin', adminRouter);
app.use('/pago', pagoRouter);
app.use('/perfil', perfilRouter);

app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`PickCrane backend escuchando en http://localhost:${PORT}`);
});
