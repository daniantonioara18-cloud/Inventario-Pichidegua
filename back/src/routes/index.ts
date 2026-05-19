import { Router } from 'express';

import healthRoutes from './health.routes';
import dbRoutes from './db.routes';
import itemsRoutes from './items.routes';
import catalogsRoutes from './catalogs.routes';
import fichasRouter from './fichas.routes';
import movimientoRoutes from './movimiento.routes';
import usuarioRoutes from   './usuarios.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use(healthRoutes);
router.use(dbRoutes);
router.use(itemsRoutes);
router.use(catalogsRoutes);
router.use(fichasRouter);
router.use(movimientoRoutes);
router.use(usuarioRoutes);
router.use(authRoutes);


export default router;
