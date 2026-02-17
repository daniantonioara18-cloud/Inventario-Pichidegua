import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();


router.get('/items', async (_req, res) => {
  try {
    const schema = 'inventario'; 

    const sql = `
    SELECT 
      i.id_item,
      i.codigo_interno,
      i.nombre,
      i.modelo,
      i.descripcion,
      i.condicion_fisica,
      i.activo,

      c.nombre  AS categoria,
      sc.nombre AS subcategoria,
      m.nombre  AS marca,
      adq.nombre AS adquisicion, -- ✅ AQUI

      ftt.serial    AS serial_tecno,
      ftm.material  AS material_mueble

      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c     ON sc.id_categoria = c.id_categoria

      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion -- ✅ AQUI
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt   ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item

      ORDER BY i.id_item DESC;
    `;

    
    const result = await pool.query(sql);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Error al obtener items:', err);
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

    // Custodia exclusiva
    if (id_user_actual && id_area_actual) {
      return res.status(400).json({
        message: 'No puedes asignar usuario y área al mismo tiempo',
      });
    }

    // 1️⃣ INSERT
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

    // 2️⃣ SELECT con JOIN (MISMO formato que GET)
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


export default router;
