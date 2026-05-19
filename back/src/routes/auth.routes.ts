import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const schema = process.env.DB_SCHEMA || 'inventario';

// Ruta: POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        // 1. Buscar el usuario
        const result = await pool.query(
            `SELECT * FROM ${schema}.user_adm WHERE email = $1`, 
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        const user = result.rows[0];

        // 2. Comparar contraseñas
        const validPassword = await bcrypt.compare(password, user.password_hash.trim());

        if (!validPassword) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // 3. Generar JWT
        const token = jwt.sign(
            { 
                id: user.id_user_adm, 
                email: user.email,
                cargo: user.cargo 
            },
            process.env.JWT_SECRET || 'secret_muni_pichidegua_2026',
            { expiresIn: '8h' }
        );

        // 4. Enviar respuesta
        res.json({
            token,
            user: {
                id: user.id_user_adm,
                nombre: user.nombre,
                email: user.email,
                cargo: user.cargo
            }
        });

    } catch (err: any) {
        console.error('Login Error:', err.message);
        res.status(500).json({ message: 'Error interno en el servidor' });
    }
});

export default router;