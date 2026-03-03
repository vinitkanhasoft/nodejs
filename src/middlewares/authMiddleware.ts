import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthenticatedRequest, IJWTpayload } from '../types/auth';
import { USER_ROLES, ROLE_PERMISSIONS } from '../constants/roles';
import { HTTP_STATUS } from '../constants/status';
import { ERROR_MESSAGES } from '../constants/messages';
import { logger } from '../config/logger';

export const authenticateToken = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_TOKEN,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as IJWTpayload;
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    logger.error('Token authentication failed:', error);
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.INVALID_TOKEN,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      timestamp: new Date().toISOString(),
    });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id}. Required roles: ${allowedRoles.join(', ')}, User role: ${req.user.role}`);
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        statusCode: HTTP_STATUS.FORBIDDEN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permissions: string | string[]) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const userPermissions = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];

    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn(`Permission denied for user ${req.user.id}. Required permissions: ${requiredPermissions.join(', ')}, User permissions: ${userPermissions.join(', ')}`);
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        statusCode: HTTP_STATUS.FORBIDDEN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

export const requireOwnership = (resourceIdParam: string = 'id') => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const resourceUserId = req.params[resourceIdParam];
    const currentUserId = req.user.id;

    // Admin can access any resource
    if (req.user.role === USER_ROLES.ADMIN) {
      next();
      return;
    }

    // Check if user owns the resource
    if (resourceUserId !== currentUserId) {
      logger.warn(`Ownership check failed for user ${currentUserId}. Resource owner: ${resourceUserId}`);
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED_ACTION,
        statusCode: HTTP_STATUS.FORBIDDEN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const decoded = jwt.verify(token, jwtSecret) as IJWTpayload;
      
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    next();
  }
};
