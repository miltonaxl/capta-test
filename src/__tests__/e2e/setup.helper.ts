/**
 * Setup configuration for E2E tests
 * This file contains common utilities and configurations for end-to-end testing
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

// Type definitions for API responses
export interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp?: string;
}

export interface WorkingDaysResponse {
  date: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

const sleep = promisify(setTimeout);

export class TestServer {
  private server: ChildProcess | null = null;
  private readonly port: number;
  private readonly baseUrl: string;

  constructor(port: number = 3001) {
    this.port = port;
    this.baseUrl = `http://localhost:${port}`;
  }

  /**
   * Start the test server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start the server with a different port for testing
      this.server = spawn('npm', ['start'], {
        env: { ...process.env, PORT: this.port.toString() },
        stdio: 'pipe'
      });

      let output = '';

      this.server.stdout?.on('data', (data) => {
        output += data.toString();
        // Check if server is ready
        if (output.includes(`running on port ${this.port}`)) {
          resolve();
        }
      });

      this.server.stderr?.on('data', () => {
        // Silently capture stderr without logging to avoid test noise
      });

      this.server.on('error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  /**
   * Stop the test server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.kill('SIGTERM');
      this.server = null;
      // Wait a bit for cleanup
      await sleep(1000);
    }
  }

  /**
   * Get the base URL for the test server
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Check if server is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for a condition to be true
   */
  async waitFor(condition: () => Promise<boolean>, timeout: number = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await sleep(100);
    }
    throw new Error('Timeout waiting for condition');
  },

  /**
   * Make HTTP request with error handling
   */
  async request(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      throw new Error(`Request failed: ${error}`);
    }
  },

  /**
   * Validate JSON response structure
   */
  validateJsonResponse(response: any, expectedKeys: string[]): void {
    for (const key of expectedKeys) {
      if (!(key in response)) {
        throw new Error(`Missing expected key: ${key}`);
      }
    }
  }
};