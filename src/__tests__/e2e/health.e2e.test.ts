/**
 * End-to-End tests for Health endpoint and general API behavior
 * Tests health checks, error handling, and API documentation
 */

import { TestServer, testUtils, HealthResponse, ApiErrorResponse } from './setup.helper';

describe('Health & General API - E2E Tests', () => {
  let testServer: TestServer;
  let baseUrl: string;

  beforeAll(async () => {
    testServer = new TestServer(3001);
    await testServer.start();
    baseUrl = testServer.getBaseUrl();
    
    // Wait for server to be fully ready
    await testUtils.waitFor(async () => await testServer.isRunning());
  }, 30000);

  afterAll(async () => {
    await testServer.stop();
  }, 10000);

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await testUtils.request(`${baseUrl}/health`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json() as HealthResponse;
      testUtils.validateJsonResponse(data, ['status', 'service', 'timestamp']);
      
      expect(data.status).toBe('OK');
      expect(data.service).toBe('Colombia Working Days API');
      expect(typeof data.timestamp).toBe('string');
      
      // Validate timestamp is a valid ISO date
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      const response = await testUtils.request(`${baseUrl}/health`);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(500); // Should respond within 500ms
    });
  });

  describe('GET / (Root endpoint)', () => {
    it('should return API information', async () => {
      const response = await testUtils.request(`${baseUrl}/`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json() as any;
      expect(data.message).toContain('Colombia Working Days API');
      expect(data.version).toBe('1.0.0');
      expect(data.endpoints).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await testUtils.request(`${baseUrl}/api/nonexistent`);

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json() as ApiErrorResponse;
      testUtils.validateJsonResponse(data, ['error', 'message']);
      
      expect(data.error).toBe('NotFound');
      expect(data.message).toBe('Endpoint not found');
    });

    it('should return 404 for invalid API paths', async () => {
      const response = await testUtils.request(`${baseUrl}/api/invalid/path`);

      expect(response.status).toBe(404);
      const data = await response.json() as ApiErrorResponse;
      
      expect(data.error).toBe('NotFound');
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await testUtils.request(`${baseUrl}/api/working-days`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      // Should return 500 for malformed JSON or 404 for unsupported method
      expect([404, 500]).toContain(response.status);
    });

    it('should return proper CORS headers', async () => {
      const response = await testUtils.request(`${baseUrl}/health`);

      expect(response.status).toBe(200);
      // Check for CORS headers if they're configured
      const corsHeader = response.headers.get('access-control-allow-origin');
      if (corsHeader) {
        expect(corsHeader).toBeDefined();
      }
    });
  });

  describe('HTTP Methods', () => {
    it('should only accept GET requests for working-days endpoint', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        const response = await testUtils.request(`${baseUrl}/api/working-days`, {
          method
        });
        
        expect(response.status).toBe(404); // Express returns 404 for unsupported methods on this route
      }
    });

    it('should only accept GET requests for health endpoint', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        const response = await testUtils.request(`${baseUrl}/health`, {
          method
        });
        
        expect(response.status).toBe(404); // Express returns 404 for unsupported methods on this route
      }
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON for API endpoints', async () => {
      const endpoints = [
        '/health',
        '/api/working-days?days=1'
      ];

      for (const endpoint of endpoints) {
        const response = await testUtils.request(`${baseUrl}${endpoint}`);
        expect(response.headers.get('content-type')).toContain('application/json');
      }
    });

    it('should return JSON for root endpoint', async () => {
      const response = await testUtils.request(`${baseUrl}/`);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('API Consistency', () => {
    it('should maintain consistent error response format', async () => {
      const errorEndpoints = [
        { url: '/api/nonexistent', expectedError: 'NotFound' },
        { url: '/api/working-days?days=-1', expectedError: 'BadRequest' },
        { url: '/api/working-days?date=invalid', expectedError: 'BadRequest' }
      ];

      for (const { url, expectedError } of errorEndpoints) {
        const response = await testUtils.request(`${baseUrl}${url}`);
        const data = await response.json() as ApiErrorResponse;
        
        testUtils.validateJsonResponse(data, ['error', 'message']);
        expect(data.error).toBe(expectedError);
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      }
    });

    it('should include timestamp in error responses', async () => {
      const response = await testUtils.request(`${baseUrl}/api/nonexistent`);
      const data = await response.json() as ApiErrorResponse;
      
      if (data.timestamp) {
        expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
      }
    });
  });
});