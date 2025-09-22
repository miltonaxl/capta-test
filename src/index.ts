import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { workingDaysController } from './controllers/workingDaysController';

const app = express();
const PORT = process.env['PORT'] || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/working-days', (req, res) => {
  workingDaysController.calculateWorkingDays(req, res);
});

app.get('/health', (req, res) => {
  workingDaysController.healthCheck(req, res);
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Colombia Working Days API',
    version: '1.0.0',
    endpoints: {
      calculate: '/api/working-days?days=<number>&hours=<number>&date=<ISO8601>',
      health: '/health'
    },
    documentation: 'See README.md for usage instructions'
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Colombia Working Days API running on port ${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}`);
});

export default app;