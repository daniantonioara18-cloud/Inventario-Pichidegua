import { Router } from 'express';

import healthRoutes from './health.routes';
import dbRoutes from './db.routes';
import itemsRoutes from './items.routes';
import catalogsRoutes from './catalogs.routes';
import fichasRouter from './fichas.routes';

const router = Router();

router.use(healthRoutes);
router.use(dbRoutes);
router.use(itemsRoutes);
router.use(catalogsRoutes);
router.use(fichasRouter);

export default router;
