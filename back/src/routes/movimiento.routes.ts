import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

router.get('/movimientos', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';

    // filtros opcionales
    const q = (req.query.q as string | undefined)?.trim() || '';
    const tipo = (req.query.tipo as string | undefined)?.trim() || ''; // 'ASIGNACION' | 'TRASLADO' ...
    const limit = Math.min(Number(req.query.limit ?? 200), 500);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (tipo) {
      where.push(`tm.nombre = $${idx++}`);
      params.push(tipo);
    }

    if (q) {
      // busca por código interno / nombre item / usuario / área
      where.push(`
        (
          i.codigo_interno ILIKE $${idx} OR
          i.nombre ILIKE $${idx} OR
          uo.nombre ILIKE $${idx} OR
          ud.nombre ILIKE $${idx} OR
          ao.nombre ILIKE $${idx} OR
          ad.nombre ILIKE $${idx} OR
          ua.nombre ILIKE $${idx}
        )
      `);
      params.push(`%${q}%`);
      idx++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT
        m.id_movimiento,
        m.fecha,
        m.observacion,

        tm.nombre AS tipo,

        i.id_item,
        i.codigo_interno,
        i.nombre AS item_nombre,

        -- origen
        m.origen_id_usuario,
        uo.nombre AS origen_usuario,
        m.origen_id_area,
        ao.nombre AS origen_area,

        -- destino
        m.destino_id_usuario,
        ud.nombre AS destino_usuario,
        m.destino_id_area,
        ad.nombre AS destino_area,

        -- admin que registra
        m.id_registro_adm,
        ua.nombre AS registrado_por

      FROM ${schema}.movimiento m
      JOIN ${schema}.tipo_movimiento tm ON tm.id_tipo_movimiento = m.id_tipo_movimiento
      JOIN ${schema}.item i ON i.id_item = m.id_item

      LEFT JOIN ${schema}.usuario uo ON uo.id_usuario = m.origen_id_usuario
      LEFT JOIN ${schema}.area_municipal ao ON ao.id_area = m.origen_id_area

      LEFT JOIN ${schema}.usuario ud ON ud.id_usuario = m.destino_id_usuario
      LEFT JOIN ${schema}.area_municipal ad ON ad.id_area = m.destino_id_area

      LEFT JOIN ${schema}.user_adm ua ON ua.id_user_adm = m.id_registro_adm

      ${whereSql}
      ORDER BY m.fecha DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    params.push(limit, offset);

    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo movimientos' });
  }
});

export default router;