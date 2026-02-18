import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

// GET todas las fichas técnicas de tecnología
router.get('/fichas/tecno', async (_req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';

    const sql = `
      SELECT
        id_ficha_tecno,
        id_item,
        serial,
        procesador,
        memoria_ram,
        disco_duro,
        direccion_ip,
        sistema_operativo,
        host_name
      FROM ${schema}.ficha_tecnica_tecno
      ORDER BY id_ficha_tecno DESC;
    `;

    const r = await pool.query(sql);
    res.json(r.rows);
  } catch (err) {
    console.error('Error fichas tecno:', err);
    res.status(500).json({ message: 'Error obteniendo fichas tecno' });
  }
});

// GET todas las fichas técnicas de muebles
router.get('/fichas/muebles', async (_req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';

    const sql = `
      SELECT
        id_ficha_mueble,
        id_item,
        material,
        color,
        dimensiones
      FROM ${schema}.ficha_tecnica_muebles
      ORDER BY id_ficha_mueble DESC;
    `;

    const r = await pool.query(sql);
    res.json(r.rows);
  } catch (err) {
    console.error('Error fichas muebles:', err);
    res.status(500).json({ message: 'Error obteniendo fichas muebles' });
  }
});

// GET ficha técnica por item (1 endpoint útil)
router.get('/fichas/item/:id', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const id_item = Number(req.params.id);

    const tecnoSql = `SELECT * FROM ${schema}.ficha_tecnica_tecno WHERE id_item = $1;`;
    const muebleSql = `SELECT * FROM ${schema}.ficha_tecnica_muebles WHERE id_item = $1;`;

    const [tecno, mueble] = await Promise.all([
      pool.query(tecnoSql, [id_item]),
      pool.query(muebleSql, [id_item]),
    ]);

    res.json({
      id_item,
      fichaTecno: tecno.rows[0] || null,
      fichaMueble: mueble.rows[0] || null,
    });
  } catch (err) {
    console.error('Error ficha por item:', err);
    res.status(500).json({ message: 'Error obteniendo ficha del item' });
  }
});

export default router;
