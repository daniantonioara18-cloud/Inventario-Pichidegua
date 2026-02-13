import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Log útil en consola
  console.error('🔥 Error:', err);

  // Si ya viene con status (a veces lo pondrás tú)
  const status = err?.status || err?.statusCode || 500;

  // Mensaje seguro al cliente
  const message =
    status >= 500
      ? 'Error interno del servidor'
      : err?.message || 'Error';

  res.status(status).json({
    message,
    // Solo mostrar detalles en desarrollo
    ...(process.env.NODE_ENV !== 'production' && { stack: err?.stack }),
  });
}
