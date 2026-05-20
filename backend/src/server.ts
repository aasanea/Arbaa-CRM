import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import propertiesRouter from './routes/properties';
import dealsRouter from './routes/deals';
import priceRequestsRouter from './routes/priceRequests';
import auditLogsRouter from './routes/auditLogs';
import usersRouter from './routes/users';
import cmsRouter from './routes/cms';
import aiRouter from './routes/ai';
import rolesRouter from './routes/roles';
import leadsRouter from './routes/leads';
import notificationsRouter from './routes/notifications';
import featuresRouter from './routes/features';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for frontend address
app.use(cors({
  origin: '*', // For development simplicity, allow all. In production, restrict to frontend domain.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes mapping
app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/price-requests', priceRequestsRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/users', usersRouter);
app.use('/api/cms', cmsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/features', featuresRouter);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Arbaa Real Estate CRM API - v1.0.0' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Express Error Handler:', err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم.' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
