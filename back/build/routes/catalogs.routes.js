"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const router = (0, express_1.Router)();
const schema = process.env.DB_SCHEMA || 'inventario';
// Marcas
router.get('/catalogs/marcas', async (_req, res) => {
    const r = await db_1.pool.query(`SELECT id_marca, nombre FROM ${schema}.marca ORDER BY nombre`);
    res.json(r.rows);
});
// Categorías
router.get('/catalogs/categorias', async (_req, res) => {
    const r = await db_1.pool.query(`SELECT id_categoria, nombre FROM ${schema}.categoria ORDER BY nombre`);
    res.json(r.rows);
});
// Subcategorías (con su categoría)
router.get('/catalogs/subcategorias', async (_req, res) => {
    const r = await db_1.pool.query(`
    SELECT sc.id_subcategoria, sc.nombre, sc.id_categoria, c.nombre AS categoria
    FROM ${schema}.subcategoria sc
    JOIN ${schema}.categoria c ON c.id_categoria = sc.id_categoria
    ORDER BY c.nombre, sc.nombre
  `);
    res.json(r.rows);
});
// Áreas
router.get('/catalogs/areas', async (_req, res) => {
    const r = await db_1.pool.query(`SELECT id_area, nombre FROM ${schema}.area_municipal ORDER BY nombre`);
    res.json(r.rows);
});
// Usuarios
router.get('/catalogs/usuarios', async (_req, res) => {
    const r = await db_1.pool.query(`SELECT id_usuario, nombre FROM ${schema}.usuario ORDER BY nombre`);
    res.json(r.rows);
});
// Modos de adquisición
router.get('/catalogs/adquisiciones', async (_req, res) => {
    const r = await db_1.pool.query(`SELECT id_adquisicion, nombre FROM ${schema}.modo_adquisicion ORDER BY nombre`);
    res.json(r.rows);
});
exports.default = router;
