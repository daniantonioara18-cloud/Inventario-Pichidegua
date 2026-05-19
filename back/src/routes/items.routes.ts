import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import ExcelJS from 'exceljs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import fs from 'fs';

const router = Router();
const upload = multer({ dest: 'uploads/' });
const schema = process.env.DB_SCHEMA || 'inventario';

// ======================
// HELPERS
// ======================

function limpiarFila(row: any) {
  const categoriaRaw = row['categoria'] || row['Categoría'] || row['Categoria'] || '';
  const tipoRaw = row['tipo'] || row['Tipo'] || row['TIPO'] || '';
  
  let tipo: 'TECNO' | 'MUEBLE' | '' = '';
  
  if (tipoRaw) {
    tipo = String(tipoRaw).toUpperCase().trim() as 'TECNO' | 'MUEBLE';
  } else if (categoriaRaw) {
    const cat = String(categoriaRaw).toLowerCase().trim();
    if (cat === 'tecnología' || cat === 'tecnologia') tipo = 'TECNO';
    if (cat === 'mobiliario') tipo = 'MUEBLE';
  }

  return {
    codigo_interno: row['codigo_interno'] || row['Código'] || row['codigo'] || null,
    nombre: row['nombre'] || row['Nombre'] || null,
    tipo: tipo,
    categoria: categoriaRaw,
    subcategoria: row['subcategoria'] || row['Subcategoría'] || row['Subcategoria'] || null,
    marca: row['marca'] || row['Marca'] || null,
    adquisicion: row['adquisicion'] || row['Adquisición'] || row['Adquisicion'] || null,
    condicion: row['condicion_fisica'] || row['condicion'] || row['Condición'] || row['Condicion'] || 'Bueno',
    vida_util_meses: Number(row['vida_util_meses'] || row['Vida Útil (meses)'] || 48),
    modelo: row['modelo'] || row['Modelo'] || null,
    descripcion: row['descripcion'] || row['Descripción'] || null,
    serial: row['serial'] || row['Serial'] || null,
    procesador: row['procesador'] || row['Procesador'] || null,
    ram: row['memoria_ram'] || row['ram'] || row['RAM'] || null,
    disco: row['disco_duro'] || row['disco'] || row['Disco'] || null,
    ip: row['direccion_ip'] || row['ip'] || row['IP'] || null,
    so: row['sistema_operativo'] || row['so'] || row['S.O.'] || row['SO'] || null,
    hostname: row['host_name'] || row['hostname'] || row['Hostname'] || null,
    material: row['material'] || row['Material'] || null,
    color: row['color'] || row['Color'] || null,
    dimensiones: row['dimensiones'] || row['Dimensiones'] || null,
  };
}

// ======================
// GET /api/items
// ======================
router.get('/items', async (req: Request, res: Response) => {
  try {
    const usuarioId = req.query.usuario_id;
    
    let sql = `
      SELECT i.id_item, i.codigo_interno, i.nombre, i.modelo, i.descripcion,
        i.condicion_fisica, i.activo, i.id_user_actual,
        i.uuid_qr, i.ultimo_escaneo, i.contador_escaneos,
        c.nombre AS categoria, sc.id_subcategoria, sc.nombre AS subcategoria,
        m.nombre AS marca, adq.nombre AS adquisicion,
        ftt.serial AS serial_tecno, ftm.material AS material_mueble
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c ON sc.id_categoria = c.id_categoria
      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item
    `;
    
    const params: any[] = [];
    
    if (usuarioId) {
      sql += ` WHERE i.id_user_actual = $1`;
      params.push(usuarioId);
    }
    
    sql += ` ORDER BY i.id_item DESC;`;
    
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener items:', err);
    res.status(500).json({ message: 'Error obteniendo items' });
  }
});

// ======================
// GET /api/items/export
// ======================
router.get('/items/export', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT i.codigo_interno, i.nombre, i.modelo, i.descripcion,
        i.condicion_fisica, i.vida_util_meses,
        CASE WHEN i.activo THEN 'Operativo' ELSE 'Baja' END AS estado,
        c.nombre AS categoria, sc.nombre AS subcategoria,
        m.nombre AS marca, adq.nombre AS adquisicion,
        u.nombre AS usuario_asignado, a.nombre AS area_asignada,
        ftt.serial, ftt.procesador, ftt.memoria_ram, ftt.disco_duro,
        ftt.direccion_ip, ftt.sistema_operativo, ftt.host_name,
        ftm.material, ftm.color, ftm.dimensiones
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c ON sc.id_categoria = c.id_categoria
      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      ORDER BY i.codigo_interno ASC;
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');
    worksheet.columns = [
      { header: 'Código', key: 'codigo_interno', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Subcategoría', key: 'subcategoria', width: 15 },
      { header: 'Marca', key: 'marca', width: 15 },
      { header: 'Adquisición', key: 'adquisicion', width: 18 },
      { header: 'Condición', key: 'condicion_fisica', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Vida Útil (meses)', key: 'vida_util_meses', width: 12 },
      { header: 'Custodio', key: 'usuario_asignado', width: 25 },
      { header: 'Área', key: 'area_asignada', width: 20 },
      { header: 'Serial', key: 'serial', width: 20 },
      { header: 'Procesador', key: 'procesador', width: 20 },
      { header: 'RAM', key: 'memoria_ram', width: 12 },
      { header: 'Disco', key: 'disco_duro', width: 12 },
      { header: 'IP', key: 'direccion_ip', width: 15 },
      { header: 'S.O.', key: 'sistema_operativo', width: 20 },
      { header: 'Hostname', key: 'host_name', width: 20 },
      { header: 'Material', key: 'material', width: 15 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'Dimensiones', key: 'dimensiones', width: 20 },
    ];
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 28;
    result.rows.forEach((item: any, i: number) => {
      const row = worksheet.addRow({
        ...item,
        usuario_asignado: item.usuario_asignado || 'Sin asignar',
        area_asignada: item.area_asignada || 'Sin asignar',
      });
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        });
      }
    });
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Inventario_${fecha}.xlsx`);
    res.send(await workbook.xlsx.writeBuffer());
  } catch (err) {
    console.error('Error exportando:', err);
    res.status(500).json({ message: 'Error generando Excel' });
  }
});

// ======================
// GET /api/items/plantilla
// ======================
router.get('/items/plantilla', async (_req: Request, res: Response) => {
  try {
    const [subcats, marcas, adqs] = await Promise.all([
      pool.query(`SELECT s.nombre, c.nombre AS categoria FROM ${schema}.subcategoria s JOIN ${schema}.categoria c ON s.id_categoria=c.id_categoria ORDER BY c.nombre,s.nombre`),
      pool.query(`SELECT nombre, tipo FROM ${schema}.marca ORDER BY nombre`),
      pool.query(`SELECT nombre FROM ${schema}.modo_adquisicion ORDER BY nombre`),
    ]);

    const workbook = new ExcelJS.Workbook();

    const ws = workbook.addWorksheet('Plantilla');
    ws.columns = [
      { header: 'codigo_interno', key: 'codigo_interno', width: 15 },
      { header: 'nombre', key: 'nombre', width: 30 },
      { header: 'tipo', key: 'tipo', width: 10 },
      { header: 'subcategoria', key: 'subcategoria', width: 15 },
      { header: 'marca', key: 'marca', width: 15 },
      { header: 'adquisicion', key: 'adquisicion', width: 18 },
      { header: 'condicion', key: 'condicion', width: 12 },
      { header: 'vida_util_meses', key: 'vida_util_meses', width: 12 },
      { header: 'modelo', key: 'modelo', width: 15 },
      { header: 'descripcion', key: 'descripcion', width: 30 },
      { header: 'serial', key: 'serial', width: 15 },
      { header: 'procesador', key: 'procesador', width: 20 },
      { header: 'ram', key: 'ram', width: 10 },
      { header: 'disco', key: 'disco', width: 10 },
      { header: 'ip', key: 'ip', width: 15 },
      { header: 'so', key: 'so', width: 15 },
      { header: 'hostname', key: 'hostname', width: 15 },
      { header: 'material', key: 'material', width: 15 },
      { header: 'color', key: 'color', width: 10 },
      { header: 'dimensiones', key: 'dimensiones', width: 15 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 28;

    ws.addRow({
      codigo_interno: 'TIC-010', nombre: 'Notebook Dell', tipo: 'TECNO',
      subcategoria: 'Notebooks', marca: 'Dell', adquisicion: 'Compra Directa',
      condicion: 'Nuevo', vida_util_meses: 36, modelo: 'Latitude 5420',
      serial: 'ABC123', procesador: 'Intel i7', ram: '16GB', disco: '512GB SSD',
    });
    ws.addRow({
      codigo_interno: 'MUE-010', nombre: 'Silla Oficina', tipo: 'MUEBLE',
      subcategoria: 'Sillas', marca: 'Genérica', adquisicion: 'Compra Directa',
      condicion: 'Nuevo', vida_util_meses: 60, material: 'Tela', color: 'Negro',
    });

    const notaRow = ws.addRow(['⚠️ NOTAS: tipo=TECNO o MUEBLE | subcategoria debe coincidir exactamente con hoja "Catálogos" | columnas TECNO: serial,procesador,ram,disco,ip,so,hostname | columnas MUEBLE: material,color,dimensiones']);
    notaRow.font = { italic: true, color: { argb: 'FF6B7280' }, size: 10 };
    ws.mergeCells(`A${notaRow.number}:T${notaRow.number}`);

    const wsCat = workbook.addWorksheet('Catálogos');
    wsCat.columns = [
      { header: 'Subcategorías', key: 'subcat', width: 20 },
      { header: 'Categoría', key: 'categ', width: 15 },
      { header: '', key: 'sep', width: 5 },
      { header: 'Marcas TECNO', key: 'marcaTecno', width: 20 },
      { header: '', key: 'sep2', width: 5 },
      { header: 'Marcas MUEBLE', key: 'marcaMueble', width: 20 },
      { header: '', key: 'sep3', width: 5 },
      { header: 'Adquisiciones', key: 'adq', width: 20 },
    ];

    const catHeaderRow = wsCat.getRow(1);
    catHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    catHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

    const marcasTecno = marcas.rows.filter(m => m.tipo === 'TECNO');
    const marcasMueble = marcas.rows.filter(m => m.tipo === 'MUEBLE');
    const maxRows = Math.max(subcats.rows.length, marcasTecno.length, marcasMueble.length, adqs.rows.length);

    for (let i = 0; i < maxRows; i++) {
      wsCat.addRow({
        subcat: subcats.rows[i]?.nombre || '',
        categ: subcats.rows[i]?.categoria || '',
        marcaTecno: marcasTecno[i]?.nombre || '',
        marcaMueble: marcasMueble[i]?.nombre || '',
        adq: adqs.rows[i]?.nombre || '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Importacion.xlsx');
    res.send(await workbook.xlsx.writeBuffer());
  } catch (err) {
    console.error('Error generando plantilla:', err);
    res.status(500).json({ message: 'Error generando plantilla' });
  }
});

// ======================
// POST /api/items/import-preview
// ======================
router.post('/items/import-preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se envió archivo' });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);

    fs.unlinkSync(req.file.path);

    const preview = json.slice(0, 5).map((row: any, idx: number) => {
      const limpio = limpiarFila(row);
      return {
        fila: idx + 2,
        ...limpio
      };
    });

    res.json({ preview, total: json.length });
  } catch (err) {
    console.error('Error en import-preview:', err);
    res.status(500).json({ message: 'Error leyendo archivo' });
  }
});

// ======================
// POST /api/items/import
// ======================
router.post('/items/import', upload.single('file'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).json({ message: 'No se envió archivo' });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const items = XLSX.utils.sheet_to_json(worksheet) as any[];

    fs.unlinkSync(req.file.path);

    if (items.length === 0) return res.status(400).json({ message: 'El archivo está vacío' });

    const [subcats, marcas, adqs] = await Promise.all([
      pool.query(`SELECT id_subcategoria, nombre FROM ${schema}.subcategoria`),
      pool.query(`SELECT id_marca, nombre, tipo FROM ${schema}.marca`),
      pool.query(`SELECT id_adquisicion, nombre FROM ${schema}.modo_adquisicion`),
    ]);

    const resultados: any[] = [];
    let exitosos = 0;
    let fallidos = 0;

    for (const [i, row] of items.entries()) {
      try {
        await client.query('BEGIN');

        const categoriaExcel = String(row.categoria || '').trim().toLowerCase();
        let tipo: 'TECNO' | 'MUEBLE';

        if (categoriaExcel.includes('tecno')) {
          tipo = 'TECNO';
        } else if (categoriaExcel.includes('mobil') || categoriaExcel.includes('muebl')) {
          tipo = 'MUEBLE';
        } else {
          throw new Error(`Categoría desconocida: "${row.categoria}". Use Tecnología o Mobiliario.`);
        }

        if (!row.codigo_interno) throw new Error('Falta codigo_interno');
        if (!row.nombre) throw new Error('Falta nombre');

        const subcat = subcats.rows.find(s => {
          const db = s.nombre.toLowerCase().trim();
          const excel = String(row.subcategoria || '').toLowerCase().trim();
          return db === excel || db === excel + 's' || excel === db + 's' || db.startsWith(excel.substring(0, 5));
        });

        if (!subcat) throw new Error(`Subcategoría no encontrada: "${row.subcategoria}"`);

        const marca = marcas.rows.find(m =>
          m.nombre.toLowerCase().trim() === String(row.marca || '').trim().toLowerCase() && m.tipo === tipo
        );

        const adq = adqs.rows.find(a => {
          const db = a.nombre.toLowerCase().trim();
          const excel = String(row.adquisicion || '').toLowerCase().trim();
          return db === excel || db.includes(excel) || excel.includes(db);
        });

        const insertResult = await client.query(
          `INSERT INTO ${schema}.item
            (codigo_interno, nombre, modelo, descripcion, vida_util_meses, condicion_fisica, activo,
             id_subcategoria, id_marca, id_adquisicion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id_item;`,
          [
            String(row.codigo_interno).trim(), 
            String(row.nombre).trim(),
            row.modelo || null, 
            row.descripcion || null,
            row.vida_util_meses ? Number(row.vida_util_meses) : null,
            row.condicion_fisica || 'Bueno', 
            true,
            subcat.id_subcategoria, 
            marca?.id_marca || null, 
            adq?.id_adquisicion || null
          ]
        );
        
        const id_item = insertResult.rows[0].id_item;

        if (tipo === 'TECNO') {
          await client.query(
            `INSERT INTO ${schema}.ficha_tecnica_tecno
              (id_item, serial, procesador, memoria_ram, disco_duro, direccion_ip, sistema_operativo, host_name)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              id_item, 
              row.serial || null, 
              row.procesador || null, 
              row.memoria_ram || null, 
              row.disco_duro || null,   
              row.direccion_ip || null, 
              row.sistema_operativo || null, 
              row.host_name || null
            ]
          );
        } else {
          await client.query(
            `INSERT INTO ${schema}.ficha_tecnica_muebles (id_item, material, color, dimensiones)
              VALUES ($1, $2, $3, $4)`,
            [id_item, row.material || null, row.color || null, row.dimensiones || null]
          );
        }

        await client.query('COMMIT');
        resultados.push({ fila: i + 2, codigo: row.codigo_interno, estado: 'ok' });
        exitosos++;

      } catch (err: any) {
        await client.query('ROLLBACK');
        const msg = err.code === '23505' ? 'Código interno duplicado' : err.message;
        resultados.push({ fila: i + 2, codigo: row.codigo_interno || '?', estado: 'error', mensaje: msg });
        fallidos++;
      }
    }

    res.json({ exitosos, fallidos, resultados });
  } catch (err) {
    console.error('Error crítico en importación:', err);
    res.status(500).json({ message: 'Error interno en el servidor al procesar la importación' });
  } finally {
    client.release();
  }
});

// ╔══════════════════════════════════════════════════════════════╗
// ║  RUTAS NUEVAS: QR / CÓDIGO DE BARRA                          ║
// ║  IMPORTANTE: /items/scan/:valor va ANTES de /items/:id       ║
// ║  porque si no, Express captura "scan" como si fuera un ID    ║
// ╚══════════════════════════════════════════════════════════════╝

// ======================
// GET /api/items/scan/:valor
// Busca por código interno (MUB-035) o UUID del QR
// ======================
router.get('/items/scan/:valor', async (req: Request, res: Response) => {
  try {
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

// ======================
// GET /api/items/:id/etiqueta
// Datos mínimos para generar QR + Código de Barra
// ======================
router.get('/items/:id/etiqueta', async (req: Request, res: Response) => {
  try {
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

// GET /api/items/qr/:uuid — resuelve UUID y devuelve datos para cualquier cliente
router.get('/items/qr/:uuid', async (req: Request, res: Response) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const { uuid } = req.params;

    const sql = `
      SELECT i.id_item, i.codigo_interno, i.nombre, i.modelo, i.condicion_fisica,
             i.activo, i.uuid_qr, c.nombre AS categoria, sc.nombre AS subcategoria,
             m.nombre AS marca, u.nombre AS usuario_actual, a.nombre AS area_actual
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON sc.id_subcategoria = i.id_subcategoria
      JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
      LEFT JOIN ${schema}.marca m ON m.id_marca = i.id_marca
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      WHERE i.uuid_qr = $1 LIMIT 1;
    `;
    const r = await pool.query(sql, [uuid]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    // Actualizar contador
    await pool.query(
      `UPDATE ${schema}.item SET contador_escaneos = COALESCE(contador_escaneos, 0) + 1 WHERE id_item = $1`,
      [r.rows[0].id_item]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
});

// ======================
// GET /api/items/:id
// ======================
router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id || isNaN(Number(id))) return res.status(400).json({ message: 'ID inválido' });
    const result = await pool.query(`
      SELECT i.id_item, i.codigo_interno, i.nombre, i.modelo, i.descripcion,
        i.vida_util_meses, i.condicion_fisica, i.activo,
        i.id_subcategoria, i.id_marca, i.id_adquisicion,
        i.id_user_actual, i.id_area_actual,
        c.nombre AS categoria, sc.nombre AS subcategoria,
        m.nombre AS marca, adq.nombre AS adquisicion,
        u.nombre AS usuario_asignado, a.nombre AS area_asignada,
        ftt.id_ficha_tecno, ftt.serial, ftt.procesador, ftt.memoria_ram,
        ftt.disco_duro, ftt.direccion_ip, ftt.sistema_operativo, ftt.host_name,
        ftm.id_ficha_mueble, ftm.material, ftm.color, ftm.dimensiones
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON i.id_subcategoria = sc.id_subcategoria
      JOIN ${schema}.categoria c ON sc.id_categoria = c.id_categoria
      LEFT JOIN ${schema}.marca m ON i.id_marca = m.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.ficha_tecnica_tecno ftt ON i.id_item = ftt.id_item
      LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item = ftm.id_item
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      WHERE i.id_item = $1 LIMIT 1;
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener item:', err);
    res.status(500).json({ message: 'Error obteniendo item' });
  }
});

// ======================
// POST /api/items
// ======================
router.post('/items', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      codigo_interno, nombre, modelo=null, descripcion=null,
      vida_util_meses=null, condicion_fisica=null, activo=true,
      id_subcategoria, id_marca=null, id_adquisicion=null,
      id_user_actual=null, id_area_actual=null, tipo,
    } = req.body;
    const fichaTecno = req.body.fichaTecno ?? req.body.ficha_tecnica ?? null;
    const fichaMueble = req.body.fichaMueble ?? req.body.ficha_mueble ?? null;

    if (!codigo_interno || !nombre || !id_subcategoria)
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    if (tipo !== 'TECNO' && tipo !== 'MUEBLE')
      return res.status(400).json({ message: 'Tipo inválido' });

    await client.query('BEGIN');
    const insertResult = await client.query(
      `INSERT INTO ${schema}.item (codigo_interno,nombre,modelo,descripcion,vida_util_meses,
        condicion_fisica,activo,id_subcategoria,id_marca,id_adquisicion,id_user_actual,id_area_actual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id_item;`,
      [codigo_interno,nombre,modelo,descripcion,vida_util_meses,
       condicion_fisica,activo,id_subcategoria,id_marca,id_adquisicion,id_user_actual,id_area_actual]
    );
    const id_item = insertResult.rows[0].id_item;

    if (tipo === 'TECNO') {
      await client.query(
        `INSERT INTO ${schema}.ficha_tecnica_tecno
         (id_item,serial,procesador,memoria_ram,disco_duro,direccion_ip,sistema_operativo,host_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8);`,
        [id_item, fichaTecno?.serial??null, fichaTecno?.procesador??null,
         fichaTecno?.memoria_ram??null, fichaTecno?.disco_duro??null,
         fichaTecno?.direccion_ip??null, fichaTecno?.sistema_operativo??null,
         fichaTecno?.host_name??fichaTecno?.hostname??null]
      );
    }
    if (tipo === 'MUEBLE') {
      await client.query(
        `INSERT INTO ${schema}.ficha_tecnica_muebles (id_item,material,color,dimensiones)
         VALUES ($1,$2,$3,$4);`,
        [id_item, fichaMueble?.material??null, fichaMueble?.color??null, fichaMueble?.dimensiones??null]
      );
    }
    await client.query('COMMIT');
    const itemResult = await client.query(
      `SELECT i.id_item,i.codigo_interno,i.nombre,i.modelo,i.descripcion,i.condicion_fisica,i.activo,
        c.nombre AS categoria,sc.nombre AS subcategoria,m.nombre AS marca,adq.nombre AS adquisicion,
        ftt.serial AS serial_tecno,ftm.material AS material_mueble
       FROM ${schema}.item i
       JOIN ${schema}.subcategoria sc ON i.id_subcategoria=sc.id_subcategoria
       JOIN ${schema}.categoria c ON sc.id_categoria=c.id_categoria
       LEFT JOIN ${schema}.marca m ON i.id_marca=m.id_marca
       LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion=i.id_adquisicion
       LEFT JOIN ${schema}.ficha_tecnica_tecno ftt ON i.id_item=ftt.id_item
       LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item=ftm.id_item
       WHERE i.id_item=$1;`, [id_item]
    );
    return res.status(201).json({ message: 'Item creado', item: itemResult.rows[0] });
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    if (err.code === '23505') return res.status(409).json({ message: 'Código interno duplicado' });
    if (err.code === '23503') return res.status(400).json({ message: 'FK inválida' });
    return res.status(500).json({ message: 'Error creando item' });
  } finally { client.release(); }
});

// ======================
// POST /api/items/:id/asignar
// ======================
router.post('/items/:id/asignar', async (req: Request, res: Response) => {
  const id_item = Number(req.params.id);
  const { destino_id_usuario=null, destino_id_area=null, observacion=null, id_registro_adm } = req.body;
  if (!Number.isFinite(id_item)) return res.status(400).json({ message: 'ID inválido' });
  if (!id_registro_adm) return res.status(400).json({ message: 'Falta id_registro_adm' });
  if (!destino_id_usuario || !destino_id_area)
    return res.status(400).json({ message: 'Debes enviar destino_id_usuario Y destino_id_area' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qItem = await client.query(
      `SELECT id_user_actual,id_area_actual FROM ${schema}.item WHERE id_item=$1 FOR UPDATE`, [id_item]);
    if (qItem.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Item no encontrado' }); }
    const { id_user_actual, id_area_actual } = qItem.rows[0];
    if (id_user_actual !== null || id_area_actual !== null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Este item ya fue asignado. Usa Mover.' });
    }
    const qTipo = await client.query(`SELECT id_tipo_movimiento FROM ${schema}.tipo_movimiento WHERE nombre='ASIGNACION' LIMIT 1`);
    const id_tipo_movimiento = qTipo.rows[0]?.id_tipo_movimiento;
    if (!id_tipo_movimiento) { await client.query('ROLLBACK'); return res.status(500).json({ message: 'No existe tipo ASIGNACION' }); }
    await client.query(
      `INSERT INTO ${schema}.movimiento (observacion,id_tipo_movimiento,id_item,id_registro_adm,origen_id_area,origen_id_usuario,destino_id_area,destino_id_usuario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [observacion,id_tipo_movimiento,id_item,id_registro_adm,null,null,destino_id_area,destino_id_usuario]
    );
    await client.query(`UPDATE ${schema}.item SET id_user_actual=$1,id_area_actual=$2 WHERE id_item=$3`,
      [destino_id_usuario,destino_id_area,id_item]);
    await client.query('COMMIT');
    res.json({ message: 'Asignado correctamente' });
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    if (err.code === '23503') return res.status(400).json({ message: 'FK inválida' });
    return res.status(500).json({ message: 'Error asignando' });
  } finally { client.release(); }
});

// ======================
// POST /api/items/:id/mover
// ======================
router.post('/items/:id/mover', async (req: Request, res: Response) => {
  const id_item = Number(req.params.id);
  const { destino_id_usuario=null, destino_id_area=null, observacion=null, id_registro_adm } = req.body;
  if (!Number.isFinite(id_item)) return res.status(400).json({ message: 'ID inválido' });
  if (!id_registro_adm) return res.status(400).json({ message: 'Falta id_registro_adm' });
  if (!destino_id_usuario) return res.status(400).json({ message: 'Debes enviar destino_id_usuario' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qItem = await client.query(
      `SELECT id_user_actual,id_area_actual FROM ${schema}.item WHERE id_item=$1 FOR UPDATE`, [id_item]);
    if (qItem.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Item no encontrado' }); }
    const { id_user_actual, id_area_actual } = qItem.rows[0];
    if (id_user_actual === null && id_area_actual === null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Item no asignado. Usa Asignar.' });
    }
    if (Number(destino_id_usuario) === Number(id_user_actual)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El item ya está asignado a ese usuario' });
    }
    const qUser = await client.query(`SELECT id_area FROM ${schema}.usuario WHERE id_usuario=$1`, [destino_id_usuario]);
    if (qUser.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Usuario no existe' }); }
    const areaRealDelUsuario = qUser.rows[0].id_area;
    if (destino_id_area !== null && Number(destino_id_area) !== Number(areaRealDelUsuario)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El usuario no pertenece a esa área' });
    }
    const qTipo = await client.query(`SELECT id_tipo_movimiento FROM ${schema}.tipo_movimiento WHERE nombre='TRASLADO' LIMIT 1`);
    const id_tipo_movimiento = qTipo.rows[0]?.id_tipo_movimiento;
    if (!id_tipo_movimiento) { await client.query('ROLLBACK'); return res.status(500).json({ message: 'No existe tipo TRASLADO' }); }
    await client.query(
      `INSERT INTO ${schema}.movimiento (observacion,id_tipo_movimiento,id_item,id_registro_adm,origen_id_area,origen_id_usuario,destino_id_area,destino_id_usuario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [observacion,id_tipo_movimiento,id_item,id_registro_adm,id_area_actual,id_user_actual,areaRealDelUsuario,destino_id_usuario]
    );
    await client.query(`UPDATE ${schema}.item SET id_user_actual=$1,id_area_actual=$2 WHERE id_item=$3`,
      [destino_id_usuario,areaRealDelUsuario,id_item]);
    await client.query('COMMIT');
    return res.json({ message: 'Movido correctamente' });
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    if (err.code === '23503') return res.status(400).json({ message: 'FK inválida' });
    return res.status(500).json({ message: 'Error moviendo' });
  } finally { client.release(); }
});

// ======================
// PUT /api/items/:id
// ======================
router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const id_item = Number(req.params.id);
    if (!Number.isFinite(id_item)) return res.status(400).json({ message: 'ID inválido' });
    const { nombre, modelo=null, descripcion=null, vida_util_meses=null,
            condicion_fisica=null, id_marca=null, id_adquisicion=null, 
            id_subcategoria=null, activo=null } = req.body;
    if (!nombre) return res.status(400).json({ message: 'Falta nombre' });
    const r = await pool.query(
      `UPDATE ${schema}.item SET nombre=$1,modelo=$2,descripcion=$3,vida_util_meses=$4,
       condicion_fisica=$5,id_marca=$6,id_adquisicion=$7,id_subcategoria=$8,
       activo=COALESCE($9, activo)
       WHERE id_item=$10 RETURNING id_item;`,
      [nombre,modelo,descripcion,vida_util_meses,condicion_fisica,
       id_marca,id_adquisicion,id_subcategoria,activo,id_item]
    );
    if (r.rowCount === 0) return res.status(404).json({ message: 'Item no encontrado' });
    const full = await pool.query(
      `SELECT i.id_item,i.codigo_interno,i.nombre,i.modelo,i.descripcion,i.vida_util_meses,
        i.condicion_fisica,i.activo,i.id_subcategoria,i.id_marca,i.id_adquisicion,
        i.id_user_actual,i.id_area_actual,
        c.nombre AS categoria,sc.nombre AS subcategoria,m.nombre AS marca,adq.nombre AS adquisicion,
        ftt.id_ficha_tecno,ftt.serial,ftt.procesador,ftt.memoria_ram,ftt.disco_duro,
        ftt.direccion_ip,ftt.sistema_operativo,ftt.host_name,
        ftm.id_ficha_mueble,ftm.material,ftm.color,ftm.dimensiones
       FROM ${schema}.item i
       JOIN ${schema}.subcategoria sc ON i.id_subcategoria=sc.id_subcategoria
       JOIN ${schema}.categoria c ON sc.id_categoria=c.id_categoria
       LEFT JOIN ${schema}.marca m ON i.id_marca=m.id_marca
       LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion=i.id_adquisicion
       LEFT JOIN ${schema}.ficha_tecnica_tecno ftt ON i.id_item=ftt.id_item
       LEFT JOIN ${schema}.ficha_tecnica_muebles ftm ON i.id_item=ftm.id_item
       WHERE i.id_item=$1 LIMIT 1;`, [id_item]
    );
    return res.json(full.rows[0]);
  } catch (err: any) {
    if (err?.code === '23503') return res.status(400).json({ message: 'FK inválida' });
    return res.status(500).json({ message: 'Error actualizando item' });
  }
});

// GET /api/items/public/:uuid — ficha pública por UUID del QR (sin autenticación)
router.get('/items/public/:uuid', async (req: Request, res: Response) => {
  try {
    const schema = process.env.DB_SCHEMA || 'inventario';
    const { uuid } = req.params;

    const sql = `
      SELECT
        i.id_item,
        i.codigo_interno,
        i.nombre,
        i.modelo,
        i.descripcion,
        i.condicion_fisica,
        i.activo,
        i.fecha_ingreso,
        i.vida_util_meses,
        i.uuid_qr,
        c.nombre AS categoria,
        sc.nombre AS subcategoria,
        m.nombre AS marca,
        adq.nombre AS adquisicion,
        u.nombre AS usuario_actual,
        a.nombre AS area_actual
      FROM ${schema}.item i
      JOIN ${schema}.subcategoria sc ON sc.id_subcategoria = i.id_subcategoria
      JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
      LEFT JOIN ${schema}.marca m ON m.id_marca = i.id_marca
      LEFT JOIN ${schema}.modo_adquisicion adq ON adq.id_adquisicion = i.id_adquisicion
      LEFT JOIN ${schema}.usuario u ON u.id_usuario = i.id_user_actual
      LEFT JOIN ${schema}.area_municipal a ON a.id_area = i.id_area_actual
      WHERE i.uuid_qr = $1
      LIMIT 1;
    `;
    const r = await pool.query(sql, [uuid]);

    if (r.rows.length === 0) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    // Actualizar contador de escaneos públicos
    await pool.query(
      `UPDATE ${schema}.item 
       SET contador_escaneos = COALESCE(contador_escaneos, 0) + 1 
       WHERE id_item = $1`,
      [r.rows[0].id_item]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo ficha pública' });
  }
});

export default router;