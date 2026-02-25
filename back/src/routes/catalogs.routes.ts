import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

const schema = process.env.DB_SCHEMA || 'inventario';

// Marcas
// router.get('/catalogs/marcas', async (_req, res) => {
//   try {
//     // Esta consulta es la que conecta con las marcas que tu amigo insertó
//     const result = await pool.query(`SELECT * FROM ${schema}.marca ORDER BY nombre ASC`);
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Error al obtener marcas' });
//   }
// });
// Marcas (con filtro opcional por tipo)



// GET /catalogs/marcas?tipo=TECNO|MUEBLE
router.get('/catalogs/marcas', async (req, res) => {
  try {
    const tipo = (req.query.tipo as string | undefined)?.toUpperCase();

    if (tipo && tipo !== 'TECNO' && tipo !== 'MUEBLE') {
      return res.status(400).json({ error: 'tipo inválido (TECNO|MUEBLE)' });
    }

    const sql = tipo
      ? `SELECT id_marca, nombre, tipo FROM ${schema}.marca WHERE tipo = $1 ORDER BY nombre ASC`
      : `SELECT id_marca, nombre, tipo FROM ${schema}.marca ORDER BY nombre ASC`;

    const result = tipo
      ? await pool.query(sql, [tipo])
      : await pool.query(sql);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Crear marca (para el botón "Agregar marca")
// POST /catalogs/marcas  { nombre, tipo }
router.post('/catalogs/marcas', async (req, res) => {
  try {
    const { nombre, tipo } = req.body;

    if (!nombre || !tipo) return res.status(400).json({ error: 'Falta nombre o tipo' });

    const t = String(tipo).toUpperCase();
    if (t !== 'TECNO' && t !== 'MUEBLE') return res.status(400).json({ error: 'tipo inválido' });

    const r = await pool.query(
      `INSERT INTO ${schema}.marca (nombre, tipo)
       VALUES ($1,$2)
       RETURNING id_marca, nombre, tipo`,
      [String(nombre).trim(), t]
    );

    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    // unique violation
    if (err?.code === '23505') return res.status(409).json({ error: 'Marca ya existe para ese tipo' });
    console.error(err);
    res.status(500).json({ error: 'Error creando marca' });
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
// Usuarios (con su área)

router.get('/catalogs/usuarios', async (_req, res) => {
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
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = u.id_area
      ORDER BY u.nombre ASC;
    `;
    const r = await pool.query(sql);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});



// Modos de adquisición
router.get('/catalogs/adquisiciones', async (_req, res) => {
  const r = await pool.query(`SELECT id_adquisicion, nombre FROM ${schema}.modo_adquisicion ORDER BY nombre`);
  res.json(r.rows);
});



router.post('/catalogs/usuarios', async (req, res) => {
  try {
    const { nombre, email, cargo = null, id_area = null } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ message: 'Faltan nombre o email' });
    }

    const sql = `
      INSERT INTO ${schema}.usuario (nombre, email, cargo, id_area)
      VALUES ($1,$2,$3,$4)
      RETURNING id_usuario, nombre, email, cargo, id_area
    `;
    const r = await pool.query(sql, [nombre, email, cargo, id_area]);
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err?.code === '23505') return res.status(409).json({ message: 'Email ya existe' });
    if (err?.code === '23503') return res.status(400).json({ message: 'Área inválida' });
    res.status(500).json({ message: 'Error creando usuario' });
  }
});

export default router;
