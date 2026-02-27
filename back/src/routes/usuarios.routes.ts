import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();
const schema = process.env.DB_SCHEMA || 'inventario';

//
// GET /usuarios  (CRUD real, trae área con nombre)
//
router.get('/usuarios', async (_req, res) => {
  try {
    const sql = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.email,
        u.cargo,
        u.id_area,
        a.nombre AS area_nombre
      FROM ${schema}.usuario u
      LEFT JOIN ${schema}.area_municipal a 
        ON a.id_area = u.id_area
      ORDER BY u.nombre ASC
    `;

    const r = await pool.query(sql);
    res.json(r.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
});

//
// POST /usuarios
//
router.post('/usuarios', async (req, res) => {
  try {
    const { nombre, email, cargo = null, id_area } = req.body;

    if (!nombre || !email || !id_area) {
      return res.status(400).json({
        message: 'Faltan nombre, email o área'
      });
    }

    const sql = `
      INSERT INTO ${schema}.usuario (nombre, email, cargo, id_area)
      VALUES ($1,$2,$3,$4)
      RETURNING id_usuario
    `;

    const insert = await pool.query(sql, [
      nombre,
      email,
      cargo,
      id_area
    ]);

    // devolver con nombre de área incluido
    const sql2 = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.email,
        u.cargo,
        u.id_area,
        a.nombre AS area_nombre
      FROM ${schema}.usuario u
      LEFT JOIN ${schema}.area_municipal a 
        ON a.id_area = u.id_area
      WHERE u.id_usuario = $1
    `;

    const result = await pool.query(sql2, [insert.rows[0].id_usuario]);

    res.status(201).json(result.rows[0]);

  } catch (err: any) {
    console.error(err);

    if (err.code === '23505')
      return res.status(409).json({ message: 'Email ya existe' });

    if (err.code === '23503')
      return res.status(400).json({ message: 'Área inválida' });

    res.status(500).json({ message: 'Error creando usuario' });
  }
});


router.delete('/usuarios/:id', async (req, res) => {
  const schema = process.env.DB_SCHEMA || 'inventario';
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    // 1️⃣ Verificar si tiene items asignados
    const check = await pool.query(
      `SELECT 1 FROM ${schema}.item WHERE id_user_actual = $1 LIMIT 1`,
      [id]
    );

    if ((check.rowCount??0) > 0) {
      return res.status(409).json({
        message: 'No puedes eliminar este usuario porque tiene ítems asignados'
      });
    }

    // 2️⃣ Eliminar usuario
    const result = await pool.query(
      `DELETE FROM ${schema}.usuario WHERE id_usuario = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando usuario' });
  }
});
router.put('/usuarios/:id', async (req, res) => {
  try {
    const id_usuario = Number(req.params.id);
    if (!Number.isFinite(id_usuario)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const {
      nombre,
      email,
      cargo = null,
      id_area = null,
    } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ message: 'Faltan nombre o email' });
    }

    // UPDATE
    const updateSql = `
      UPDATE ${schema}.usuario
      SET nombre = $1,
          email = $2,
          cargo = $3,
          id_area = $4
      WHERE id_usuario = $5
      RETURNING id_usuario, nombre, email, cargo, id_area;
    `;

    const r = await pool.query(updateSql, [
      String(nombre).trim(),
      String(email).trim(),
      cargo ? String(cargo).trim() : null,
      id_area,
      id_usuario,
    ]);

    if (r.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // traer nombre del área (para que el front muestre texto, no id)
    const selectSql = `
      SELECT
        u.id_usuario, u.nombre, u.email, u.cargo, u.id_area,
        a.nombre AS nombre_area
      FROM ${schema}.usuario u
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = u.id_area
      WHERE u.id_usuario = $1
      LIMIT 1;
    `;
    const full = await pool.query(selectSql, [id_usuario]);

    return res.json(full.rows[0]);
  } catch (err: any) {
    console.error(err);

    if (err?.code === '23505') {
      return res.status(409).json({ message: 'Email ya existe' });
    }
    if (err?.code === '23503') {
      return res.status(400).json({ message: 'Área inválida' });
    }

    return res.status(500).json({ message: 'Error actualizando usuario' });
  }
});





export default router;