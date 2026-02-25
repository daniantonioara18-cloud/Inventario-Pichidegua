import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estructura de los datos que guardaremos en el pase VIP (Token)
interface JwtPayload {
  id: number;
  email: string;
  cargo: string;
}

export const verificarToken = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Buscamos el token en la petición que manda el Frontend
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  // 2. Si no trae token, lo bloqueamos
  if (!token) {
    res.status(403).json({ error: 'Acceso denegado. Faltan credenciales.' });
    return;
  }

  try {
    // 3. Verificamos que el token sea nuestro y no sea inventado
    const secret = process.env.JWT_SECRET || 'llave_secreta_muni_pichidegua_2026';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // 4. Si está todo bien, lo dejamos pasar a la ruta que quería (next)
    (req as any).user = decoded; 
    next(); 
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};