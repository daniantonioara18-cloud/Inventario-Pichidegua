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
        u.nombre AS usuario_asignado,
        a.nombre AS area_asignada,  

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
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual

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


router.post('/items/:id/asignar', async (req, res) => {
  const schema = process.env.DB_SCHEMA || 'inventario';
  const id_item = Number(req.params.id);

  const {
    destino_id_usuario = null,
    destino_id_area = null,
    observacion = null,
    id_registro_adm, // quien registra
  } = req.body;

  if (!Number.isFinite(id_item)) return res.status(400).json({ message: 'ID inválido' });
  if (!id_registro_adm) return res.status(400).json({ message: 'Falta id_registro_adm' });

  // Deben venir ambos
  const tieneUsuario = destino_id_usuario !== null && destino_id_usuario !== undefined;
  const tieneArea = destino_id_area !== null && destino_id_area !== undefined;
  if (!tieneUsuario || !tieneArea) {
  return res.status(400).json({ message: 'Debes enviar destino_id_usuario Y destino_id_area' });
}

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) verificar estado actual
    const qItem = await client.query(
      `SELECT id_user_actual, id_area_actual FROM ${schema}.item WHERE id_item = $1 FOR UPDATE`,
      [id_item]
    );
    if (qItem.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    const { id_user_actual, id_area_actual } = qItem.rows[0];

    // si ya tiene custodia -> no permitir
    if (id_user_actual !== null || id_area_actual !== null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Este item ya fue asignado. Usa Mover.' });
    }

    // 2) obtener id tipo movimiento = ASIGNACION
    const qTipo = await client.query(
      `SELECT id_tipo_movimiento FROM ${schema}.tipo_movimiento WHERE nombre = 'ASIGNACION' LIMIT 1`
    );
    const id_tipo_movimiento = qTipo.rows[0]?.id_tipo_movimiento;
    if (!id_tipo_movimiento) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: 'No existe tipo_movimiento ASIGNACION' });
    }

    // 3) insertar movimiento (origen null, destino según)
    await client.query(
      `INSERT INTO ${schema}.movimiento (
        observacion, id_tipo_movimiento, id_item, id_registro_adm,
        origen_id_area, origen_id_usuario,
        destino_id_area, destino_id_usuario
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        observacion,
        id_tipo_movimiento,
        id_item,
        id_registro_adm,
        null, null,
        tieneArea ? destino_id_area : null,
        tieneUsuario ? destino_id_usuario : null,
      ]
    );

    // 4) actualizar item (custodia exclusiva)
    await client.query(
      `UPDATE ${schema}.item
       SET id_user_actual = $1,
           id_area_actual = $2
       WHERE id_item = $3`,
      [destino_id_usuario, destino_id_area, id_item]
    );

    await client.query('COMMIT');
    res.json({ message: 'Asignado correctamente' });
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ message: 'FK inválida (usuario/área no existe)' });
    return res.status(500).json({ message: 'Error asignando' });
  } finally {
    client.release();
  }
});


router.post('/items/:id/mover', async (req, res) => {
  const schema = process.env.DB_SCHEMA || 'inventario';
  const id_item = Number(req.params.id);

  const {
    destino_id_usuario = null,
    destino_id_area = null, // opcional: si viene, la validamos contra el área real del usuario
    observacion = null,
    id_registro_adm,
  } = req.body;

  if (!Number.isFinite(id_item)) return res.status(400).json({ message: 'ID inválido' });
  if (!id_registro_adm) return res.status(400).json({ message: 'Falta id_registro_adm' });

  const tieneUsuario = destino_id_usuario !== null && destino_id_usuario !== undefined;
  if (!tieneUsuario) {
    return res.status(400).json({ message: 'Debes enviar destino_id_usuario' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Leer estado actual del item (bloqueo fila)
    const qItem = await client.query(
      `SELECT id_user_actual, id_area_actual
       FROM ${schema}.item
       WHERE id_item = $1
       FOR UPDATE`,
      [id_item]
    );

    if (qItem.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    const { id_user_actual, id_area_actual } = qItem.rows[0];

    // 2) Si NO tiene custodia -> no mover
    if (id_user_actual === null && id_area_actual === null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Este item aún no está asignado. Usa Asignar.' });
    }

    // 3) No permitir mover al mismo usuario
    if (Number(destino_id_usuario) === Number(id_user_actual)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El item ya está asignado a ese usuario' });
    }

    // 4) Obtener área real del usuario destino (y validar que exista)
    const qUser = await client.query(
      `SELECT id_area
       FROM ${schema}.usuario
       WHERE id_usuario = $1`,
      [destino_id_usuario]
    );

    if (qUser.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'FK inválida (usuario no existe)' });
    }

    const areaRealDelUsuario = qUser.rows[0].id_area;

    // Si el front mandó destino_id_area, validamos que calce (opcional, pero recomendado)
    if (destino_id_area !== null && destino_id_area !== undefined) {
      if (Number(destino_id_area) !== Number(areaRealDelUsuario)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'El usuario no pertenece a esa área' });
      }
    }

    // 5) Tipo movimiento TRASLADO
    const qTipo = await client.query(
      `SELECT id_tipo_movimiento
       FROM ${schema}.tipo_movimiento
       WHERE nombre = 'TRASLADO'
       LIMIT 1`
    );

    const id_tipo_movimiento = qTipo.rows[0]?.id_tipo_movimiento;
    if (!id_tipo_movimiento) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: 'No existe tipo_movimiento TRASLADO' });
    }

    // 6) Insertar movimiento (origen = actual, destino = nuevo)
    await client.query(
      `INSERT INTO ${schema}.movimiento (
        observacion, id_tipo_movimiento, id_item, id_registro_adm,
        origen_id_area, origen_id_usuario,
        destino_id_area, destino_id_usuario
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        observacion,
        id_tipo_movimiento,
        id_item,
        id_registro_adm,
        id_area_actual,
        id_user_actual,
        areaRealDelUsuario,
        destino_id_usuario,
      ]
    );

    // 7) Actualizar item: nuevo custodio (usuario + su área real)
    await client.query(
      `UPDATE ${schema}.item
       SET id_user_actual = $1,
           id_area_actual = $2
       WHERE id_item = $3`,
      [destino_id_usuario, areaRealDelUsuario, id_item]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Movido correctamente' });
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(err);

    // FK inválida (por ejemplo id_registro_adm no existe en user_adm)
    if (err.code === '23503') {
      return res.status(400).json({ message: 'FK inválida (usuario/área/admin no existe)' });
    }

    return res.status(500).json({ message: 'Error moviendo' });
  } finally {
    client.release();
  }
});


router.put('/items/:id', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const id_item = Number(req.params.id);

    if (!Number.isFinite(id_item)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const {
      nombre,
      modelo = null,
      descripcion = null,
      vida_util_meses = null,
      condicion_fisica = null,
      id_marca = null,
      id_adquisicion = null,
      id_subcategoria = null,
    } = req.body;

    if (!nombre) return res.status(400).json({ message: 'Falta nombre' });

    const sql = `
      UPDATE ${schema}.item
      SET nombre = $1,
          modelo = $2,
          descripcion = $3,
          vida_util_meses = $4,
          condicion_fisica = $5,
          id_marca = $6,
          id_adquisicion = $7,
          id_subcategoria = $8
      WHERE id_item = $9
      RETURNING id_item;
    `;

    const r = await pool.query(sql, [
      nombre, modelo, descripcion, vida_util_meses,
      condicion_fisica, id_marca, id_adquisicion, id_subcategoria,
      id_item
    ]);

    if (r.rowCount === 0) return res.status(404).json({ message: 'Item no encontrado' });

    // devolver el item completo (como tu GET /items/:id)
    const full = await pool.query(
      `SELECT 
        i.id_item, i.codigo_interno, i.nombre, i.modelo, i.descripcion, i.vida_util_meses,
        i.condicion_fisica, i.activo,
        i.id_subcategoria, i.id_marca, i.id_adquisicion,
        i.id_user_actual, i.id_area_actual,
        c.nombre AS categoria,
        sc.nombre AS subcategoria,
        m.nombre AS marca,
        adq.nombre AS adquisicion,
        ftt.id_ficha_tecno, ftt.serial, ftt.procesador, ftt.memoria_ram, ftt.disco_duro,
        ftt.direccion_ip, ftt.sistema_operativo, ftt.host_name,
        ftm.id_ficha_mueble, ftm.material, ftm.color, ftm.dimensiones
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c ON sc.id_categoria = c.id_categoria
      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item
      WHERE i.id_item = $1
      LIMIT 1;`,
      [id_item]
    );

    return res.json(full.rows[0]);
  } catch (err: any) {
    console.error(err);
    if (err?.code === '23503') return res.status(400).json({ message: 'FK inválida (revisa ids)' });
    return res.status(500).json({ message: 'Error actualizando item' });
  }
});






export default router;
