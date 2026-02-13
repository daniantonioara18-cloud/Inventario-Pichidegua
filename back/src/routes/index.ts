import { Router } from 'express';

import healthRoutes from './health.routes';
import dbRoutes from './db.routes';
import itemsRoutes from './items.routes';
import catalogsRoutes from './catalogs.routes';

const router = Router();

router.use(healthRoutes);
router.use(dbRoutes);
router.use(itemsRoutes);
router.use(catalogsRoutes);

export default router;
