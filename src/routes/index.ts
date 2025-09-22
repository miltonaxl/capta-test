import { Router } from 'express';
import { workingDaysController } from '../controllers/workingDaysController';

const router = Router();

/**
 * Working Days API Routes
 */

// Calculate working date time
router.post('/calculate', workingDaysController.calculateWorkingDays);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Working Days API'
  });
});

// API info endpoint
router.get('/info', (_req, res) => {
  res.json({
    name: 'Working Days API',
    version: '1.0.0',
    description: 'API para calcular días y horas hábiles en Colombia',
    endpoints: {
      'POST /api/v1/calculate': 'Calcula fecha y hora hábil agregando días y horas',
      'GET /api/v1/health': 'Verificación de estado del servicio',
      'GET /api/v1/info': 'Información de la API'
    }
  });
});

export default router;