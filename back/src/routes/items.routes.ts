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
        i.condicion_fisica,
        i.activo,

        c.nombre  AS categoria,
        sc.nombre AS subcategoria,
        m.nombre  AS marca,
        adq.nombre AS adquisicion,

        ftt.serial    AS serial_tecno,
        ftm.material  AS material_mueble

      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c     ON sc.id_categoria = c.id_categoria

      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
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



router.get('/items/:id', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const id = req.params.id;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const sql = `
      SELECT 
        i.id_item,
        i.codigo_interno,
        i.nombre,
        i.modelo,
        i.descripcion,
        i.vida_util_meses,
        i.condicion_fisica,
        i.activo,

        i.id_subcategoria,
        i.id_marca,
        i.id_adquisicion,
        i.id_user_actual,
        i.id_area_actual,

        c.nombre  AS categoria,
        sc.nombre AS subcategoria,
        m.nombre  AS marca,
        adq.nombre AS adquisicion,

        ftt.id_ficha_tecno,
        ftt.serial,
        ftt.procesador,
        ftt.memoria_ram,
        ftt.disco_duro,
        ftt.direccion_ip,
        ftt.sistema_operativo,
        ftt.host_name,

        ftm.id_ficha_mueble,
        ftm.material,
        ftm.color,
        ftm.dimensiones

      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c     ON sc.id_categoria = c.id_categoria

      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt   ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item

      WHERE i.id_item = $1
      LIMIT 1;
    `;

    const result = await pool.query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener item:', err);
    res.status(500).json({ message: 'Error obteniendo item' });
  }
});



router.post('/items', async (req, res) => {
  const schema = process.env.DB_SCHEMA || 'inventario';
  const client = await pool.connect();

  try {
    // -------------------------
    // 1) Leer body
    // -------------------------
    const {
      // item base
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

      // tipo (modal previo)
      tipo, // 'TECNO' | 'MUEBLE'
    } = req.body;

    // ✅ IMPORTANTE: aceptar ambos nombres desde el front
    // (tu front manda ficha_tecnica / ficha_mueble)
    const fichaTecno = req.body.fichaTecno ?? req.body.ficha_tecnica ?? null;
    const fichaMueble = req.body.fichaMueble ?? req.body.ficha_mueble ?? null;

    // -------------------------
    // 2) Validaciones
    // -------------------------
    if (!codigo_interno || !nombre || !id_subcategoria) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios: codigo_interno, nombre, id_subcategoria',
      });
    }

    if (id_user_actual && id_area_actual) {
      return res.status(400).json({
        message: 'No puedes asignar usuario y área al mismo tiempo',
      });
    }

    if (tipo !== 'TECNO' && tipo !== 'MUEBLE') {
      return res.status(400).json({ message: 'Tipo inválido. Usa TECNO o MUEBLE' });
    }

    await client.query('BEGIN');

    // -------------------------
    // 3) Insertar ITEM y obtener id_item real
    // -------------------------
    const insertItemSql = `
      INSERT INTO ${schema}.item (
        codigo_interno, nombre, modelo, descripcion, vida_util_meses,
        condicion_fisica, activo,
        id_subcategoria, id_marca, id_adquisicion,
        id_user_actual, id_area_actual
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id_item;
    `;

    const insertItemValues = [
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

    const insertResult = await client.query(insertItemSql, insertItemValues);
    const id_item = insertResult.rows[0].id_item;

    // -------------------------
    // 4) Insertar FICHA según tipo
    // -------------------------
    if (tipo === 'TECNO') {
      // Aquí mapeamos y toleramos hostname vs host_name
      const serial = fichaTecno?.serial ?? null;
      const procesador = fichaTecno?.procesador ?? null;
      const memoria_ram = fichaTecno?.memoria_ram ?? null;
      const disco_duro = fichaTecno?.disco_duro ?? null;
      const direccion_ip = fichaTecno?.direccion_ip ?? null;
      const sistema_operativo = fichaTecno?.sistema_operativo ?? null;
      const host_name = fichaTecno?.host_name ?? fichaTecno?.hostname ?? null;

      const insertFichaTecnoSql = `
        INSERT INTO ${schema}.ficha_tecnica_tecno (
          id_item, serial, procesador, memoria_ram, disco_duro, direccion_ip, sistema_operativo, host_name
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
      `;

      await client.query(insertFichaTecnoSql, [
        id_item,               // ✅ SIEMPRE el id recién creado
        serial,
        procesador,
        memoria_ram,
        disco_duro,
        direccion_ip,
        sistema_operativo,
        host_name,
      ]);
    }

    if (tipo === 'MUEBLE') {
      const material = fichaMueble?.material ?? null;
      const color = fichaMueble?.color ?? null;
      const dimensiones = fichaMueble?.dimensiones ?? null;

      const insertFichaMuebleSql = `
        INSERT INTO ${schema}.ficha_tecnica_muebles (
          id_item, material, color, dimensiones
        )
        VALUES ($1,$2,$3,$4);
      `;

      await client.query(insertFichaMuebleSql, [id_item, material, color, dimensiones]);
    }

    await client.query('COMMIT');

    // -------------------------
    // 5) Devolver item en formato “GET /items”
    // -------------------------
    const selectSql = `
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
        adq.nombre AS adquisicion,

        ftt.serial    AS serial_tecno,
        ftm.material  AS material_mueble

      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c     ON sc.id_categoria = c.id_categoria
      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt   ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item
      WHERE i.id_item = $1;
    `;

    const itemResult = await client.query(selectSql, [id_item]);

    return res.status(201).json({
      message: 'Item creado',
      item: itemResult.rows[0],
    });
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Error creando item:', err);

    if (err.code === '23505') return res.status(409).json({ message: 'Código interno duplicado' });
    if (err.code === '23503') return res.status(400).json({ message: 'FK inválida (revisa ids)' });

    return res.status(500).json({ message: 'Error creando item' });
  } finally {
    client.release();
  }
});

export default router;
