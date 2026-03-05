import express, { Application, Request, Response, NextFunction } from 'express';
import commandRoutes from './routes/commandRoutes';
import feishuRoutes from './routes/feishuRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// API Routes
app.use('/api/v1/commands', commandRoutes);
app.use('/api/v1/feishu', feishuRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[GLOBAL_ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] Gateway running on port ${PORT}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
});

export default app;
