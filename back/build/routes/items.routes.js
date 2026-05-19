import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

router.get('/items', async (_req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const sql = `
      SELECT
        i.id_item,
        i.codigo_interno,
        i.nombre,
        i.modelo,
        i.descripcion,
        i.fecha_ingreso,
        i.condicion_fisica,
        i.activo,
        i.uuid_qr,
        i.ultimo_escaneo,
        i.contador_escaneos,
        c.nombre  AS categoria,
        sc.nombre AS subcategoria,
        m.nombre  AS marca,
        u.nombre  AS usuario_actual,
        a.nombre  AS area_actual
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON sc.id_subcategoria = i.id_subcategoria
      JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
      LEFT JOIN ${schema}.marca m ON m.id_marca = i.id_marca
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      ORDER BY i.id_item DESC
      LIMIT 200;
    `;
    const r = await pool.query(sql);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo items' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const {
      codigo_interno,
      nombre,
      modelo = null,
      descripcion = null,
      vida_util_meses = null,
      condicion_fisica = null,
      activo = true,
      id_subcategoria,
      id_marca = null,
      id_adquisicion = null,
      id_user_actual = null,
      id_area_actual = null,
    } = req.body;

    if (!codigo_interno || !nombre || !id_subcategoria) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    if (id_user_actual && id_area_actual) {
      return res.status(400).json({
        message: 'No puedes asignar usuario y área al mismo tiempo',
      });
    }

    const insertSql = `
      INSERT INTO ${schema}.item (
        codigo_interno, nombre, modelo, descripcion, vida_util_meses,
        condicion_fisica, activo,
        id_subcategoria, id_marca, id_adquisicion,
        id_user_actual, id_area_actual
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id_item;
    `;
    const insertValues = [
      codigo_interno,
      nombre,
      modelo,
      descripcion,
      vida_util_meses,
      condicion_fisica,
      activo,
      id_subcategoria,
      id_marca,
      id_adquisicion,
      id_user_actual,
      id_area_actual,
    ];
    const insertResult = await pool.query(insertSql, insertValues);
    const id_item = insertResult.rows[0].id_item;

    const selectSql = `
      SELECT
        i.id_item,
        i.codigo_interno,
        i.nombre,
        i.modelo,
        i.descripcion,
        i.fecha_ingreso,
        i.condicion_fisica,
        i.activo,
        i.uuid_qr,
        i.ultimo_escaneo,
        i.contador_escaneos,
        c.nombre  AS categoria,
        sc.nombre AS subcategoria,
        m.nombre  AS marca,
        u.nombre  AS usuario_actual,
        a.nombre  AS area_actual
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON sc.id_subcategoria = i.id_subcategoria
      JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
      LEFT JOIN ${schema}.marca m ON m.id_marca = i.id_marca
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      WHERE i.id_item = $1;
    `;
    const itemResult = await pool.query(selectSql, [id_item]);
    return res.status(201).json({
      message: 'Item creado',
      item: itemResult.rows[0],
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Código interno duplicado' });
    }
    return res.status(500).json({ message: 'Error creando item' });
  }
});

// ============================================
// NUEVO: ESCANEAR POR CÓDIGO O UUID DEL QR
// ============================================
router.get('/items/scan/:valor', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const { valor } = req.params;

    const sql = `
      SELECT
        i.id_item,
        i.codigo_interno,
        i.nombre,
        i.modelo,
        i.descripcion,
        i.fecha_ingreso,
        i.condicion_fisica,
        i.activo,
        i.uuid_qr,
        i.ultimo_escaneo,
        i.contador_escaneos,
        c.nombre  AS categoria,
        sc.nombre AS subcategoria,
        m.nombre  AS marca,
        u.nombre  AS usuario_actual,
        a.nombre  AS area_actual
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON sc.id_subcategoria = i.id_subcategoria
      JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
      LEFT JOIN ${schema}.marca m ON m.id_marca = i.id_marca
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      WHERE i.codigo_interno = $1 OR i.uuid_qr::text = $1
      LIMIT 1;
    `;
    const r = await pool.query(sql, [valor]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    const item = r.rows[0];

    // Actualizar estadísticas de escaneo
    await pool.query(
      `UPDATE ${schema}.item 
       SET ultimo_escaneo = NOW(), 
           contador_escaneos = COALESCE(contador_escaneos, 0) + 1 
       WHERE id_item = $1`,
      [item.id_item]
    );

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error escaneando item' });
  }
});

// ============================================
// NUEVO: DATOS PARA GENERAR ETIQUETA QR/BARRA
// ============================================
router.get('/items/:id/etiqueta', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const { id } = req.params;

    const sql = `
      SELECT
        i.id_item,
        i.codigo_interno,
        i.nombre,
        i.modelo,
        i.condicion_fisica,
        i.uuid_qr,
        c.nombre  AS categoria,
        sc.nombre AS subcategoria
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON sc.id_subcategoria = i.id_subcategoria
      JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
      WHERE i.id_item = $1
      LIMIT 1;
    `;
    const r = await pool.query(sql, [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo etiqueta' });
  }
});

export default router;