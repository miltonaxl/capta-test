/**
 * End-to-End tests for Edge Cases and Data Validation
 * Tests boundary conditions, edge cases, and complex scenarios
 */

import { TestServer, testUtils, WorkingDaysResponse, ApiErrorResponse } from './setup.helper';

describe('Edge Cases & Data Validation - E2E Tests', () => {
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

  describe('Boundary Value Testing', () => {
    it('should handle zero values correctly', async () => {
      // Test with only zero values - service accepts this and returns current time
      const response1 = await testUtils.request(
        `${baseUrl}/api/working-days?days=0&hours=0`
      );

      expect(response1.status).toBe(200);
      const data1 = await response1.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data1, ['date']);

      // Test with one zero value and one valid value - should work
      const response2 = await testUtils.request(
        `${baseUrl}/api/working-days?days=0&hours=1`
      );

      expect(response2.status).toBe(200);
      const data2 = await response2.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data2, ['date']);
    });

    it('should handle very large numbers', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=365&hours=2920`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should return a valid future date
      const resultDate = new Date(data.date);
      expect(resultDate.getFullYear()).toBeGreaterThan(2024);
    });

    it('should handle decimal numbers in days parameter', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1.5`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should return a valid future date
      const resultDate = new Date(data.date);
      expect(resultDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle decimal numbers in hours parameter', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=1.5`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should return a valid date
      const resultDate = new Date(data.date);
      expect(resultDate).toBeInstanceOf(Date);
      expect(isNaN(resultDate.getTime())).toBe(false);
    });
  });

  describe('Date Edge Cases', () => {
    it('should handle year boundaries correctly', async () => {
      // December 31st, 2024
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2024-12-31T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should move to next year (skipping New Year's Day)
      expect(data.date).toBe('2025-01-02T15:00:00.000Z');
    });

    it('should handle leap year dates', async () => {
      // February 29th, 2024 (leap year)
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2024-02-29T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
      
      // Should handle leap year date correctly
      expect(new Date(data.date).getTime()).toBeGreaterThan(new Date('2024-02-29T15:00:00.000Z').getTime());
    });

    it('should handle very old dates', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2020-01-01T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
    });

    it('should handle far future dates', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2030-12-31T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
    });
  });

  describe('Holiday Edge Cases', () => {
    it('should handle multiple consecutive holidays', async () => {
      // Start before Christmas week 2024
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=3&date=2024-12-23T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should skip Christmas (Dec 25) and continue in December
      const resultDate = new Date(data.date);
      expect(resultDate.getFullYear()).toBe(2024);
      expect(resultDate.getMonth()).toBe(11); // December
    });

    it('should handle holidays that fall on weekends', async () => {
      // Test a holiday that might fall on weekend
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2024-07-04T15:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
    });
  });

  describe('Time Zone Edge Cases', () => {
    it('should handle different time zones in input', async () => {
      const responses = await Promise.all([
        testUtils.request(`${baseUrl}/api/working-days?days=1&date=2024-01-15T00:00:00.000Z`),
        testUtils.request(`${baseUrl}/api/working-days?days=1&date=2024-01-15T12:00:00.000Z`),
        testUtils.request(`${baseUrl}/api/working-days?days=1&date=2024-01-15T23:59:59.000Z`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const data = await Promise.all(responses.map(r => r.json() as Promise<WorkingDaysResponse>));
      
      // All should return valid dates
      data.forEach(d => {
        testUtils.validateJsonResponse(d, ['date']);
        expect(new Date(d.date).toISOString()).toBe(d.date);
      });
    });

    it('should handle midnight transitions', async () => {
      // Test around midnight COT (5:00 UTC)
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=1&date=2024-01-15T04:30:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
    });
  });

  describe('Parameter Validation Edge Cases', () => {
    it('should handle empty string parameters', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=&hours=`
      );

      expect(response.status).toBe(400);
      const data = await response.json() as ApiErrorResponse;
      expect(data.error).toBe('BadRequest');
    });

    it('should handle non-numeric parameters', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=abc&hours=xyz`
      );

      expect(response.status).toBe(400);
      const data = await response.json() as ApiErrorResponse;
      expect(data.error).toBe('BadRequest');
    });

    it('should handle special characters in parameters', async () => {
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=2024-01-15T15:00:00.000Z&extra=<script>alert('xss')</script>`
      );

      // Should ignore extra parameters and process normally
      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
    });

    it('should handle URL encoding in parameters', async () => {
      const encodedDate = encodeURIComponent('2024-01-15T15:00:00.000Z');
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?days=1&date=${encodedDate}`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      testUtils.validateJsonResponse(data, ['date']);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle end of business day correctly', async () => {
      // 5:00 PM COT (22:00 UTC) - end of business day
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=1&date=2024-01-15T22:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should move to next business day
      const resultDate = new Date(data.date);
      const inputDate = new Date('2024-01-15T22:00:00.000Z');
      expect(resultDate.getDate()).toBeGreaterThan(inputDate.getDate());
    });

    it('should handle start of business day correctly', async () => {
      // 8:00 AM COT (13:00 UTC) - start of business day
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=1&date=2024-01-15T13:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should add 1 hour to same day
      expect(data.date).toBe('2024-01-15T14:00:00.000Z');
    });

    it('should handle lunch hour boundary correctly', async () => {
      // 12:00 PM COT (17:00 UTC) - start of lunch
      const response = await testUtils.request(
        `${baseUrl}/api/working-days?hours=1&date=2024-01-15T17:00:00.000Z`
      );

      expect(response.status).toBe(200);
      const data = await response.json() as WorkingDaysResponse;
      
      // Should skip to next working day and end at 9:00 AM COT (14:00 UTC)
      expect(data.date).toBe('2024-01-16T14:00:00.000Z');
    });
  });
});