import { Router } from 'express';
import { workingDaysController } from '../controllers/workingDaysController';

const router = Router();

/**
 * Working Days API Routes
 */

// Working days calculation endpoint
router.get('/working-days', workingDaysController.calculateWorkingDays);

// Health check endpoint
router.get('/health', workingDaysController.healthCheck);

// Root endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'Colombia Working Days API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      calculate: '/api/working-days?days=5&hours=8&date=2024-01-15T00:00:00.000Z'
    }
  });
});

export default router;