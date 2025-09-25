/**
 * End-to-End tests for Working Days API
 * Tests the complete API functionality with real HTTP requests
 */

import { TestServer, testUtils, WorkingDaysResponse, ApiErrorResponse } from './setup.helper';

describe('Working Days API - E2E Tests', () => {
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

  describe('GET /api/working-days', () => {
    it('should calculate working days correctly', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=5&hours=8&date=2024-01-15T00:00:00.000Z`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      expect(data.date).toBe('2024-01-22T22:00:00.000Z');
    });

    it('should handle only days parameter', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should return a valid ISO date string
      expect(new Date(data.date).toISOString()).toBe(data.date);
    });

    it('should handle only hours parameter', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=3`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should return a valid ISO date string
      expect(new Date(data.date).toISOString()).toBe(data.date);
    });

    it('should handle weekend dates correctly', async () => {
      // Saturday date
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2024-01-13T10:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should move to next Monday and add 1 day
      expect(data.date).toBe('2024-01-15T22:00:00.000Z');
    });

    it('should handle holiday dates correctly', async () => {
      // New Year's Day (January 1st)
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2024-12-31T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should skip January 1st (holiday) and go to January 2nd
      expect(data.date).toBe('2025-01-02T15:00:00.000Z');
    });

    it('should return 400 for negative days', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=-5&hours=8`
      );

      expect(response.status).toBe(400);
      const data = await response.json() as ApiErrorResponse;
      testUtils.validateJsonResponse(data, ['error', 'message']);
      
      expect(data.error).toBe('BadRequest');
      expect(data.message).toContain('Days must be a positive integer');
    });

    it('should return 400 for negative hours', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&hours=-3`
      );

      expect(response.status).toBe(400);
      const data = await response.json() as ApiErrorResponse;
      testUtils.validateJsonResponse(data, ['error', 'message']);
      
      expect(data.error).toBe('BadRequest');
      expect(data.message).toContain('Hours must be a positive integer');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=invalid-date`
      );

      expect(response.status).toBe(400);
      const data = await response.json() as ApiErrorResponse;
      testUtils.validateJsonResponse(data, ['error', 'message']);
      
      expect(data.error).toBe('BadRequest');
    });

    it('should return 400 when no parameters provided', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days`
      );

      expect(response.status).toBe(400);
      const data = await response.json() as ApiErrorResponse;
      testUtils.validateJsonResponse(data, ['error', 'message']);
      
      expect(data.error).toBe('BadRequest');
    });

    it('should handle large numbers correctly', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=10&hours=20&date=2024-01-15T08:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should return a valid future date
      const resultDate = new Date(data.date);
      const inputDate = new Date('2024-01-15T08:00:00.000Z');
      expect(resultDate.getTime()).toBeGreaterThan(inputDate.getTime());
    });

    it('should handle lunch hour correctly', async () => {
      // Start at 11:30 AM COT (16:30 UTC) and add 1 hour
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=1&date=2024-01-15T16:30:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should skip lunch hour (12-1 PM COT) and end at 1:30 PM COT (18:30 UTC)
      expect(data.date).toBe('2024-01-15T18:30:00.000Z');
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&hours=1`
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        testUtils.request(`${baseUrl}/api/working-days?days=${i + 1}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});