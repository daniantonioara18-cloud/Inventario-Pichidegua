import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

const schema = process.env.DB_SCHEMA || 'inventario';

// Marcas
router.get('/catalogs/marcas', async (_req, res) => {
  try {
    // Esta consulta es la que conecta con las marcas que tu amigo insertó
    const result = await pool.query(`SELECT * FROM ${schema}.marca ORDER BY nombre ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Categorías
router.get('/catalogs/categorias', async (_req, res) => {
  const r = await pool.query(`SELECT id_categoria, nombre FROM ${schema}.categoria ORDER BY nombre`);
  res.json(r.rows);
});

// Subcategorías (con su categoría)
router.get('/catalogs/subcategorias', async (_req, res) => {
  try {
    const sql = `
      SELECT s.id_subcategoria, s.nombre, c.nombre as categoria 
      FROM ${schema}.subcategoria s
      JOIN ${schema}.categoria c ON s.id_categoria = c.id_categoria
      ORDER BY c.nombre, s.nombre ASC
    `;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener subcategorías' });
  }
});

// Áreas
router.get('/catalogs/areas', async (_req, res) => {
  const r = await pool.query(`SELECT id_area, nombre FROM ${schema}.area_municipal ORDER BY nombre`);
  res.json(r.rows);
});

// Usuarios
router.get('/catalogs/usuarios', async (_req, res) => {
  const r = await pool.query(`SELECT id_usuario, nombre FROM ${schema}.usuario ORDER BY nombre`);
  res.json(r.rows);
});

// Modos de adquisición
router.get('/catalogs/adquisiciones', async (_req, res) => {
  const r = await pool.query(`SELECT id_adquisicion, nombre FROM ${schema}.modo_adquisicion ORDER BY nombre`);
  res.json(r.rows);
});

export default router;
