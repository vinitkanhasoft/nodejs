import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class PerformanceUtils {
  /**
   * Response time middleware
   */
  static responseTime() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      
      next();
    };
  }

  /**
   * Request logging middleware
   */
  static requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: new Date().toISOString(),
        };
        
        if (res.statusCode >= 400) {
          logger.warn('HTTP Request', logData);
        } else {
          logger.info('HTTP Request', logData);
        }
      });
      
      next();
    };
  }

  /**
   * Memory usage monitoring
   */
  static getMemoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  } {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100, // MB
    };
  }

  /**
   * CPU usage monitoring
   */
  static getCPUUsage(): {
    user: number;
    system: number;
  } {
    const usage = process.cpuUsage();
    return {
      user: usage.user,
      system: usage.system,
    };
  }

  /**
   * System performance metrics
   */
  static getSystemMetrics(): {
    uptime: number;
    memory: ReturnType<typeof PerformanceUtils.getMemoryUsage>;
    cpu: ReturnType<typeof PerformanceUtils.getCPUUsage>;
    nodeVersion: string;
    platform: string;
    arch: string;
  } {
    return {
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      cpu: this.getCPUUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  /**
   * Performance monitoring middleware
   */
  static performanceMonitor() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const startMemory = process.memoryUsage();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const endMemory = process.memoryUsage();
        
        const metrics = {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          memoryDelta: {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          },
          timestamp: new Date().toISOString(),
        };
        
        // Log slow requests
        if (duration > 1000) {
          logger.warn('Slow request detected', metrics);
        }
        
        // Log high memory usage
        if (endMemory.heapUsed > 100 * 1024 * 1024) { // 100MB
          logger.warn('High memory usage detected', {
            ...metrics,
            memoryUsage: this.getMemoryUsage(),
          });
        }
      });
      
      next();
    };
  }

  /**
   * Request timeout middleware
   */
  static requestTimeout(timeoutMs: number = 30000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          logger.warn(`Request timeout for ${req.method} ${req.path}`);
          res.status(408).json({
            success: false,
            message: 'Request timeout',
            statusCode: 408,
            timestamp: new Date().toISOString(),
          });
        }
      }, timeoutMs);
      
      res.on('finish', () => {
        clearTimeout(timeout);
      });
      
      next();
    };
  }

  /**
   * Compression middleware (simplified)
   */
  static compression() {
    return (req: Request, res: Response, next: NextFunction) => {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      if (acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        // In a real implementation, you'd compress the response
      }
      
      next();
    };
  }

  /**
   * Health check endpoint
   */
  static healthCheck(req: Request, res: Response) {
    const metrics = this.getSystemMetrics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      memory: metrics.memory,
      cpu: metrics.cpu,
      version: metrics.nodeVersion,
      platform: metrics.platform,
    };
    
    // Determine health status
    if (metrics.memory.heapUsed > 500 * 1024 * 1024) { // 500MB
      health.status = 'degraded';
    }
    
    if (metrics.memory.heapUsed > 1000 * 1024 * 1024) { // 1GB
      health.status = 'unhealthy';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  }

  /**
   * Metrics endpoint
   */
  static metrics(req: Request, res: Response) {
    const metrics = this.getSystemMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  }

  /**
   * Profiler middleware
   */
  static profiler() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint();
      const startMemory = process.memoryUsage();
      
      res.on('finish', () => {
        const end = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        const memoryDelta = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        };
        
        const profile = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration.toFixed(2)}ms`,
          memoryDelta: {
            rss: `${(memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`,
            heapUsed: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          },
          timestamp: new Date().toISOString(),
        };
        
        // Store profile data (in a real implementation, you'd store this in a database or monitoring system)
        logger.debug('Request profile', profile);
      });
      
      next();
    };
  }

  /**
   * Slow query detection
   */
  static slowQueryDetector(thresholdMs: number = 1000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        if (duration > thresholdMs) {
          logger.warn('Slow query detected', {
            method: req.method,
            path: req.path,
            duration: `${duration}ms`,
            query: req.query,
            body: req.body,
            timestamp: new Date().toISOString(),
          });
        }
      });
      
      next();
    };
  }

  /**
   * Memory leak detection
   */
  static memoryLeakDetector() {
    let lastMemory = process.memoryUsage();
    let leakCount = 0;
    
    return setInterval(() => {
      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - lastMemory.heapUsed;
      
      // Check if memory increased by more than 50MB
      if (memoryIncrease > 50 * 1024 * 1024) {
        leakCount++;
        
        if (leakCount >= 3) {
          logger.error('Potential memory leak detected', {
            memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
            currentMemory: this.getMemoryUsage(),
            leakCount,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        leakCount = 0; // Reset counter if memory decreased
      }
      
      lastMemory = currentMemory;
    }, 60000); // Check every minute
  }

  /**
   * Performance optimization suggestions
   */
  static getOptimizationSuggestions(): string[] {
    const memory = this.getMemoryUsage();
    const suggestions: string[] = [];
    
    if (memory.heapUsed > 500 * 1024 * 1024) {
      suggestions.push('Consider implementing caching to reduce memory usage');
    }
    
    if (memory.heapUsed > 1000 * 1024 * 1024) {
      suggestions.push('High memory usage detected - consider scaling horizontally');
      suggestions.push('Review memory-intensive operations');
    }
    
    if (process.uptime() > 24 * 60 * 60) { // 24 hours
      suggestions.push('Consider implementing graceful restarts for long-running processes');
    }
    
    return suggestions;
  }

  /**
   * Performance report
   */
  static generatePerformanceReport(): {
    timestamp: string;
    uptime: number;
    memory: ReturnType<typeof PerformanceUtils.getMemoryUsage>;
    cpu: ReturnType<typeof PerformanceUtils.getCPUUsage>;
    suggestions: string[];
  } {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: this.getMemoryUsage(),
      cpu: this.getCPUUsage(),
      suggestions: this.getOptimizationSuggestions(),
    };
  }
}
