import { Router, Request, Response } from 'express';
import { pool } from '../config/db';

const router = Router();
const schema = process.env.DB_SCHEMA || 'inventario';

// Fíjate que aquí solo pones '/subcategorias' porque el prefijo '/api' 
// ya se lo pusimos en el app.use del index.ts
router.post('/subcategorias', async (req: Request, res: Response) => {
    const { nombre, id_categoria_padre } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO ${schema}.subcategoria (nombre_subcategoria, id_categoria) 
             VALUES ($1, $2) RETURNING *`,
            [nombre, id_categoria_padre]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('Error al crear subcategoría:', err.message);
        res.status(500).json({ message: 'Error al guardar en la base de datos' });
    }
});

export default router;  