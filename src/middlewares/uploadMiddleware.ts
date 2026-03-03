import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { serverConfig } from '../config/server';
import { AppError } from './errorMiddleware';
import { HTTP_STATUS } from '../constants/status';
import { logger } from '../config/logger';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (serverConfig.fileUpload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type. Allowed types: ${serverConfig.fileUpload.allowedTypes.join(', ')}`, HTTP_STATUS.BAD_REQUEST, 'INVALID_FILE_TYPE'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: serverConfig.fileUpload.maxSize,
    files: 1, // Limit to 1 file per request
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (error: any) => {
      if (error) {
        logger.error('File upload error:', error);
        
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'File size exceeds limit',
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Too many files uploaded',
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: `Unexpected field name: ${error.field}`,
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
            default:
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'File upload failed',
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
          }
        }
        
        return next(error);
      }
      
      next();
    });
  };
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName: string, maxCount: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (error: any) => {
      if (error) {
        logger.error('Multiple file upload error:', error);
        
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'One or more files exceed size limit',
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: `Too many files. Maximum allowed: ${maxCount}`,
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
            default:
              return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'File upload failed',
                statusCode: HTTP_STATUS.BAD_REQUEST,
                timestamp: new Date().toISOString(),
              });
          }
        }
        
        return next(error);
      }
      
      next();
    });
  };
};

// Middleware to validate uploaded file
export const validateUploadedFile = (options: {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
} = {}) => {
  const { required = true, maxSize, allowedTypes } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    
    if (required && !file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'File is required',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (file) {
      // Check file size if custom limit provided
      if (maxSize && file.size > maxSize) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Check file type if custom types provided
      if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    next();
  };
};

// Middleware to process uploaded file and add metadata
export const processUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;
  
  if (file) {
    // Add file metadata to request
    req.fileMetadata = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      encoding: file.encoding,
      fieldname: file.fieldname,
    };
    
    logger.info(`File uploaded: ${file.originalname} (${file.size} bytes)`);
  }
  
  next();
};

// Error handling middleware for file uploads
export const handleUploadError = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error) {
    logger.error('Upload error:', error);
    
    if (error.message.includes('File type')) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: error.message,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'File upload failed',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

// Utility function to generate unique filename
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}_${randomString}.${extension}`;
};

// Utility function to validate file type from buffer
export const validateFileTypeFromBuffer = (buffer: Buffer, mimeType: string): boolean => {
  // Basic file signature validation
  const signatures: Record<string, number[]> = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
  };
  
  const signature = signatures[mimeType];
  if (!signature) return true; // Skip validation for unknown types
  
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  
  return true;
};

// Extend Express Request type to include fileMetadata
declare global {
  namespace Express {
    interface Request {
      fileMetadata?: {
        originalName: string;
        mimeType: string;
        size: number;
        uploadedAt: Date;
        encoding: string;
        fieldname: string;
      };
    }
  }
}
