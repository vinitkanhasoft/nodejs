import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/status';
import { ERROR_MESSAGES } from '../constants/messages';
import { logger, logError } from '../config/logger';
import { IErrorResponse, IValidationError } from '../types/response';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message: string = ERROR_MESSAGES.SERVER_ERROR;
  let code: string | undefined;
  let errors: IValidationError[] | undefined;

  // Handle specific error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = ERROR_MESSAGES.VALIDATION_ERROR;
    errors = handleValidationError(error);
  } else if (error.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = ERROR_MESSAGES.RESOURCE_NOT_FOUND;
    code = 'CAST_ERROR';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    const mongoError = error as any;
    if (mongoError.code === 11000) {
      statusCode = HTTP_STATUS.CONFLICT;
      message = ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
      code = 'DUPLICATE_KEY';
    }
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.INVALID_TOKEN;
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.INVALID_TOKEN;
    code = 'TOKEN_EXPIRED';
  }

  // Log error
  logError(error, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });

  const errorResponse: IErrorResponse = {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(code && { code }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const handleValidationError = (error: any): IValidationError[] => {
  const errors: IValidationError[] = [];
  
  if (error.errors) {
    Object.keys(error.errors).forEach((key) => {
      const err = error.errors[key];
      errors.push({
        field: key,
        message: err.message || 'Validation failed',
        value: err.value,
        code: err.kind,
      });
    });
  }

  return errors;
};

export const createValidationError = (
  field: string,
  message: string,
  value?: any,
  code?: string
): AppError => {
  const error = new AppError(
    ERROR_MESSAGES.VALIDATION_ERROR,
    HTTP_STATUS.BAD_REQUEST,
    'VALIDATION_ERROR'
  );
  
  // Attach validation errors to the error object
  (error as any).errors = [{
    field,
    message,
    value,
    code,
  }];
  
  return error;
};

export const throwIf = (
  condition: boolean,
  message: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  code?: string
): void => {
  if (condition) {
    throw new AppError(message, statusCode, code);
  }
};

export const throwUnless = (
  condition: boolean,
  message: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  code?: string
): void => {
  if (!condition) {
    throw new AppError(message, statusCode, code);
  }
};
