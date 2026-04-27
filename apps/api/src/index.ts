import 'dotenv/config';
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', credentials: true }));
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

app.use(errorHandler);

app.listen(PORT, () => console.log(`ZYN API running on port ${PORT}`));

export default app;
