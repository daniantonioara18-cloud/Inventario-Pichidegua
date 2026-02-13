import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import apiRouter from './routes';
import { env } from './config/env';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares base
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.send('Backend OK ✅ Usa /api/health');
});

// Rutas API
app.use('/api', apiRouter);

// 404 y errores globales
app.use(notFound);
app.use(errorHandler);

export default app;
