import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

router.get('/db-test', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() as ahora');
    res.json(r.rows[0]);
  } catch (err: any) {
    console.error('DB TEST ERROR =>', err);
    res.status(500).json({
      message: 'Error conectando a PostgreSQL',
      error: err?.message ?? String(err),
      code: err?.code ?? null,
    });
  }
});

export default router;
