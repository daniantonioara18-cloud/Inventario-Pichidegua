import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

const router = Router();
const schema = process.env.DB_SCHEMA || 'inventario';
const secret = process.env.JWT_SECRET || 'llave_secreta_muni_pichidegua_2026';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // ===============================================================
  // Pueden loguearse poniendo email "admin" y contraseña "123"
  // ¡RECUERDEN BORRAR ESTO ANTES DE ENTREGAR EL PROYECTO!
  // ===============================================================
  if (email === 'admin' && password === '123') {
    const token = jwt.sign(
      { id: 999, email: 'admin@muni.cl', cargo: 'SuperAdmin Dev' },
      secret,
      { expiresIn: '8h' }
    );
    
    return res.json({
      message: 'Login de Desarrollo exitoso',
      token: token,
      user: { nombre: 'Desarrollador', email: 'admin@muni.cl', cargo: 'Dev' }
    });
  }

  try {
    // 1. Lógica Real: Buscar al usuario en la BD
    const query = `SELECT * FROM ${schema}.user_adm WHERE email = $1`;
    const result = await pool.query(query, [email]);

    // MENSAJE GENÉRICO UNIFICADO
    const errorGenerico = 'Correo o contraseña incorrecta';

    if (result.rows.length === 0) {
      // Falla el correo, pero devolvemos el mensaje genérico
      return res.status(401).json({ error: errorGenerico });
    }

    const user = result.rows[0];

    // 2. Comparar la contraseña ingresada
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      // Falla la contraseña, devolvemos EXACTAMENTE el mismo mensaje
      return res.status(401).json({ error: errorGenerico });
    }

    // 3. Crear el Token real
    const token = jwt.sign(
      { id: user.id_user_adm, email: user.email, cargo: user.cargo }, 
      secret, 
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login exitoso',
      token: token,
      user: { nombre: user.nombre, email: user.email, cargo: user.cargo }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;