import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/status';
import { ERROR_MESSAGES } from '../constants/messages';
import { IValidationError } from '../types/response';
import { AppError } from './errorMiddleware';

export const validate = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const validatedData = schema.parse(data);
      
      // Replace the request data with validated data
      req[target] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: IValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: (err as any).received || err.path.join('.'),
        }));

        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.VALIDATION_ERROR,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          errors: validationErrors,
        });
      } else {
        next(error);
      }
    }
  };
};

export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

// Custom validation middleware for specific cases
export const validateEmail = (emailField: string = 'email') => {
  return (req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | void => {
    const email = req.body[emailField];
    
    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: emailField,
          message: 'Email is required',
          code: 'REQUIRED',
        }],
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: emailField,
          message: 'Invalid email format',
          code: 'INVALID_FORMAT',
          value: email,
        }],
      });
    }

    next();
  };
};

export const validatePassword = (passwordField: string = 'password') => {
  return (req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | void => {
    const password = req.body[passwordField];
    
    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: passwordField,
          message: 'Password is required',
          code: 'REQUIRED',
        }],
      });
    }

    if (password.length < 8) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: passwordField,
          message: 'Password must be at least 8 characters long',
          code: 'MIN_LENGTH',
          value: password,
        }],
      });
    }

    // Check for at least one uppercase letter, one lowercase letter, and one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: passwordField,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          code: 'INVALID_FORMAT',
          value: password,
        }],
      });
    }

    next();
  };
};

export const validatePasswordConfirmation = (
  passwordField: string = 'password',
  confirmPasswordField: string = 'confirmPassword'
) => {
  return (req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | void => {
    const password = req.body[passwordField];
    const confirmPassword = req.body[confirmPasswordField];

    if (password !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: confirmPasswordField,
          message: 'Passwords do not match',
          code: 'PASSWORDS_DO_NOT_MATCH',
          value: confirmPassword,
        }],
      });
    }

    next();
  };
};

export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | void => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: paramName,
          message: 'ID parameter is required',
          code: 'REQUIRED',
        }],
      });
    }

    // MongoDB ObjectId validation
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: paramName,
          message: 'Invalid ID format',
          code: 'INVALID_FORMAT',
          value: id,
        }],
      });
    }

    next();
  };
};

export const validateFileUpload = (
  maxSize: number = 5 * 1024 * 1024, // 5MB default
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) => {
  return (req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | void => {
    const file = req.file;

    if (!file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
        errors: [{
          field: 'file',
          message: 'File is required',
          code: 'REQUIRED',
        }],
      });
    }

    if (file.size > maxSize) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
          message: ERROR_MESSAGES.FILE_TOO_LARGE,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          errors: [{
            field: 'file',
            message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
            code: 'FILE_TOO_LARGE',
            value: file.size,
          }],
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_FILE_TYPE,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          errors: [{
            field: 'file',
            message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
            code: 'INVALID_FILE_TYPE',
            value: file.mimetype,
          }],
        });
      }

      next();
    };
  };
