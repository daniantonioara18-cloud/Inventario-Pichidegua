import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import dbRoutes from './routes/db.routes';
import itemsRoutes from './routes/items.routes';
import catalogsRoutes from './routes/catalogs.routes';
const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL }));

app.get('/', (_req, res) => {
  res.send('Backend OK ✅ Usa /api/health');
});

app.use('/api', healthRoutes);
app.use('/api', dbRoutes);
app.use('/api',itemsRoutes);
app.use('/api',catalogsRoutes);
app.use(express.json());


export default app;
