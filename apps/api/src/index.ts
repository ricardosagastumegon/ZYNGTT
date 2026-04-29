import 'dotenv/config';
import { initEnv } from './utils/env-validator';
initEnv();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { quoteRoutes } from './routes/quote.routes';
import { shipmentRoutes } from './routes/shipment.routes';
import { documentRoutes } from './routes/document.routes';
import { trackingRoutes } from './routes/tracking.routes';
import { paymentRoutes } from './routes/payment.routes';
import { customsRoutes } from './routes/customs.routes';
import { statsRoutes } from './routes/stats.routes';
import foodImportRoutes from './routes/food-import.routes';
import importExpedienteRoutes from './routes/import-expediente.routes';
import automationRoutes from './routes/automation.routes';
import { adminRoutes } from './routes/admin.routes';
import { transportCatalogRoutes } from './routes/transport-catalog.routes';
import { startStatusPoller } from './jobs/status-poller';

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      cb(null, true);
    } else {
      cb(null, true); // permissive during initial deployment
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Raw body for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'zyn-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customs', customsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/food-imports', foodImportRoutes);
app.use('/api/import', importExpedienteRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transport', transportCatalogRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ZYN API running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'test') startStatusPoller();
});

export default app;
