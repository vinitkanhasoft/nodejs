import { App } from './app';
import { serverConfig } from './config/server';
import { logger } from './config/logger';
import { systemEvents } from './events/otherEvents';
import { PerformanceUtils } from './enhancements/performance';

class Server {
  private app: App;
  private server: any;

  constructor() {
    this.app = new App();
  }

  public async start(): Promise<void> {
    try {
      // Initialize the application
      await this.app.initialize();

      // Start the server
      this.server = this.app.getApp().listen(serverConfig.port, serverConfig.host, () => {
        logger.info(`Server running on ${serverConfig.host}:${serverConfig.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        
        // Emit system started event
        systemEvents.emitSystemStarted({
          timestamp: new Date(),
          metadata: {
            port: serverConfig.port,
            host: serverConfig.host,
            nodeVersion: process.version,
            platform: process.platform,
          },
        });
      });

      // Handle server errors
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof serverConfig.port === 'string'
          ? 'Pipe ' + serverConfig.port
          : 'Port ' + serverConfig.port;

        switch (error.code) {
          case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(async () => {
            logger.info('HTTP server closed');
            
            try {
              // Stop cron jobs
              const { cronService } = await import('./services/cronService');
              cronService.stopAllJobs();
              logger.info('Cron jobs stopped');

              // Close database connections
              const { disconnectDatabase } = await import('./config/database');
              await disconnectDatabase();
              logger.info('Database connections closed');

              // Clear cache
              CacheUtils.clear();
              logger.info('Cache cleared');

              // Emit system shutdown event
              systemEvents.emitSystemShutdown({
                timestamp: new Date(),
              });

              logger.info('Graceful shutdown completed');
              process.exit(0);
            } catch (error) {
              logger.error('Error during graceful shutdown:', error);
              process.exit(1);
            }
          });
        }

        // Force shutdown after 30 seconds
        setTimeout(() => {
          logger.error('Forced shutdown after timeout');
          process.exit(1);
        }, 30000);

      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      systemEvents.emitSystemError(error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      systemEvents.emitSystemError(new Error(`Unhandled rejection: ${reason}`));
      process.exit(1);
    });

    // Handle warning events
    process.on('warning', (warning: Error) => {
      logger.warn('Process warning:', warning);
    });
  }

  public getApp() {
    return this.app.getApp();
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

export { Server };
