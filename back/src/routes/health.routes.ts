import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'OK', system: 'InventarioWeb' });
});

export default router;
