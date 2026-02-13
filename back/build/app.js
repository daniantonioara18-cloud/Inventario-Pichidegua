"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
/**import healthRoutes from './routes/health.routes';
import dbRoutes from './routes/db.routes';
import itemsRoutes from './routes/items.routes';
import catalogsRoutes from './routes/catalogs.routes';
*/
const app = (0, express_1.default)();
// Logs de requests (verás GET/POST en consola)
app.use((0, morgan_1.default)('dev'));
// Parser JSON (solo una vez)
app.use(express_1.default.json());
// CORS (para Angular)
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    credentials: true,
}));
app.get('/', (_req, res) => {
    res.send('Backend OK ✅ Usa /api/health');
});
// Rutas
app.use('/api', routes_1.default);
exports.default = app;
