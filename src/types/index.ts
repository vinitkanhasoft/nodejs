export * from './auth';
export * from './user';
export * from './response';

// Re-export commonly used types
export type { Request, Response, NextFunction } from 'express';
export type { Document, Types } from 'mongoose';

// Generic types
export interface IEntity {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IDeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

export interface IUpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId?: any;
}

export interface IObjectId {
  $oid: string;
}

export interface IDate {
  $date: string;
}

// Database types
export interface IDatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    bufferCommands: boolean;
    bufferMaxEntries: number;
  };
}

// Email types
export interface IEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface IEmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables?: Record<string, any>;
}

// File types
export interface IFileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface ICloudinaryFile {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  bytes: number;
  resource_type: string;
  created_at: string;
}

// Cache types
export interface ICacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface ICacheResult<T = any> {
  hit: boolean;
  data?: T;
  error?: string;
}

// Logging types
export interface ILogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: any;
}

export interface ILogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: ILogContext;
  stack?: string;
}

// Event types
export interface IEventPayload {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface IEventHandler<T = any> {
  (payload: IEventPayload & { data: T }): Promise<void> | void;
}

// Queue types
export interface IJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: 'fixed' | 'exponential';
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface IJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: IJobOptions;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  attemptsMade: number;
  failedReason?: string;
}

// Rate limiting types
export interface IRateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  isExceeded: boolean;
}

// Analytics types
export interface IAnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

export interface IAnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  uniquePageViews: number;
}
