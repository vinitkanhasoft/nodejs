import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export interface ISystemEventData {
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class SystemEvents extends EventEmitter {
  private static instance: SystemEvents;

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  static getInstance(): SystemEvents {
    if (!SystemEvents.instance) {
      SystemEvents.instance = new SystemEvents();
    }
    return SystemEvents.instance;
  }

  // System events
  emitSystemStarted(data: ISystemEventData): void {
    this.emit('system:started', data);
  }

  emitSystemShutdown(data: ISystemEventData): void {
    this.emit('system:shutdown', data);
  }

  emitSystemError(error: Error, metadata?: Record<string, any>): void {
    this.emit('system:error', {
      error,
      metadata,
      timestamp: new Date(),
    });
  }

  emitMemoryWarning(usage: number, threshold: number): void {
    this.emit('system:memory_warning', {
      usage,
      threshold,
      timestamp: new Date(),
    });
  }

  // Database events
  emitDatabaseConnected(): void {
    this.emit('database:connected', { timestamp: new Date() });
  }

  emitDatabaseDisconnected(): void {
    this.emit('database:disconnected', { timestamp: new Date() });
  }

  emitDatabaseError(error: Error): void {
    this.emit('database:error', {
      error,
      timestamp: new Date(),
    });
  }

  // Email events
  emitEmailSent(to: string, subject: string): void {
    this.emit('email:sent', {
      to,
      subject,
      timestamp: new Date(),
    });
  }

  emitEmailFailed(to: string, error: Error): void {
    this.emit('email:failed', {
      to,
      error,
      timestamp: new Date(),
    });
  }

  // File events
  emitFileUploaded(filename: string, size: number): void {
    this.emit('file:uploaded', {
      filename,
      size,
      timestamp: new Date(),
    });
  }

  emitFileDeleted(filename: string): void {
    this.emit('file:deleted', {
      filename,
      timestamp: new Date(),
    });
  }

  private setupEventHandlers(): void {
    this.on('system:started', (data: ISystemEventData) => {
      logger.info('System started', data);
    });

    this.on('system:shutdown', (data: ISystemEventData) => {
      logger.info('System shutdown', data);
    });

    this.on('system:error', (data: any) => {
      logger.error('System error', {
        error: data.error.message,
        metadata: data.metadata,
      });
    });
  }
}

export const systemEvents = SystemEvents.getInstance();
