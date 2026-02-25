import { Router } from 'express';

import healthRoutes from './health.routes';
import dbRoutes from './db.routes';
import itemsRoutes from './items.routes';
import catalogsRoutes from './catalogs.routes';
<<<<<<< Updated upstream
=======
import fichasRouter from './fichas.routes';
import authRoutes from './auth.routes';//login y registro
>>>>>>> Stashed changes

const router = Router();

router.use('/auth', authRoutes); //Pal login
router.use(healthRoutes);
router.use(dbRoutes);
router.use(itemsRoutes);
router.use(catalogsRoutes);

export default router;
