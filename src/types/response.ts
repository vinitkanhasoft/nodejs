import { HTTP_STATUS } from '../constants/status';

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

export interface IPaginatedResponse<T = any> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface IValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

export interface IErrorResponse extends IApiResponse {
  errors?: IValidationError[];
  stack?: string;
}

export interface ISuccessResponse<T = any> extends IApiResponse<T> {
  statusCode: typeof HTTP_STATUS.OK | typeof HTTP_STATUS.CREATED | typeof HTTP_STATUS.ACCEPTED;
}

export interface ICreatedResponse<T = any> extends IApiResponse<T> {
  statusCode: typeof HTTP_STATUS.CREATED;
}

export interface INoContentResponse extends IApiResponse {
  statusCode: typeof HTTP_STATUS.NO_CONTENT;
}

export interface IFileUploadResponse {
  url: string;
  publicId: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface IBulkOperationResult<T = any> {
  successful: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface IHealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    email: 'connected' | 'disconnected';
    cloudinary: 'connected' | 'disconnected';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

export interface IMetricsResponse {
  timestamp: string;
  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
    };
    users: {
      total: number;
      active: number;
      new: number;
    };
    database: {
      connections: number;
      operations: number;
      averageQueryTime: number;
    };
    cache: {
      hits: number;
      misses: number;
      hitRate: number;
    };
  };
}
