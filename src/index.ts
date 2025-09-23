import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env['PORT'] || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', router);
app.use('/', router);

// Error handling middleware (must be last)
app.use('*', notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Colombia Working Days API running on port ${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}`);
});

export default app;