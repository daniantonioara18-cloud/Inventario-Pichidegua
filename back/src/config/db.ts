import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'");
  client.query("SHOW client_encoding").then(r => console.log('ENCODING:', r.rows[0]));
});

pool.connect()
  .then(() => console.log('Conectado exitosamente a PostgreSQL'))
  .catch((err) => console.error('Error de conexión:', err));