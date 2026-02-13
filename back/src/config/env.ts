import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3001),

  // tu front (para CORS)
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:4200',

  // opcional: schema
  DB_SCHEMA: process.env.DB_SCHEMA || 'inventario',

  // si quieres obligar algo:
  // DATABASE_URL: required('DATABASE_URL'),
};
