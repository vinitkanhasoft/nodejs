import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { serverConfig } from './config/server';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';
import { RateLimiter } from './enhancements/rateLimiter';
import { PerformanceUtils } from './enhancements/performance';
import { CacheUtils } from './enhancements/cache';
import { metricsMiddleware } from './enhancements/metrics';
import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { adminRoutes } from './routes/adminRoutes';

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (serverConfig.cors.origins.includes(origin) || serverConfig.cors.origins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      }));
    }

    // Performance monitoring
    this.app.use(PerformanceUtils.responseTime());
    this.app.use(PerformanceUtils.performanceMonitor());
    this.app.use(metricsMiddleware);

    // Rate limiting
    this.app.use(RateLimiter.general);

    // Cache middleware for GET requests
    this.app.use('/api/', CacheUtils.middleware({
      ttl: 300, // 5 minutes
      condition: (req: Request) => req.method === 'GET',
    }));

    // Trust proxy for IP detection
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', PerformanceUtils.healthCheck);
    this.app.get('/metrics', PerformanceUtils.metrics);

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/admin', adminRoutes);

    // API documentation
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        message: 'API is running',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    });

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Welcome to the Node.js API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async initialize(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      logger.info('Database connected successfully');

      // Start cron jobs
      const { cronService } = await import('./services/cronService');
      cronService.startAllJobs();
      logger.info('Cron jobs started');

      // Initialize memory leak detection
      PerformanceUtils.memoryLeakDetector();

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  public getApp(): Application {
    return this.app;
  }
}
