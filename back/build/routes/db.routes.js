"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const router = (0, express_1.Router)();
router.get('/db-test', async (_req, res) => {
    try {
        const r = await db_1.pool.query('SELECT NOW() as ahora');
        res.json(r.rows[0]);
    }
    catch (err) {
        console.error('DB TEST ERROR =>', err);
        res.status(500).json({
            message: 'Error conectando a PostgreSQL',
            error: err?.message ?? String(err),
            code: err?.code ?? null,
        });
    }
});
exports.default = router;
