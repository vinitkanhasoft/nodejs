import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { serverConfig } from '../config/server';
import { HTTP_STATUS } from '../constants/status';
import { ResponseUtils } from '../utils/response';
import { logger } from '../config/logger';

export class RateLimiter {
  /**
   * General rate limiter
   */
  static general = rateLimit({
    windowMs: serverConfig.rateLimit.windowMs,
    max: serverConfig.rateLimit.maxRequests,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'Too many requests, please try again later.');
    },
  });

  /**
   * Strict rate limiter for sensitive endpoints
   */
  static strict = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
      success: false,
      message: 'Too many attempts, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'Too many attempts, please try again later.');
    },
  });

  /**
   * Auth rate limiter for login/register endpoints
   */
  static auth = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'Too many authentication attempts, please try again later.');
    },
  });

  /**
   * Password reset rate limiter
   */
  static passwordReset = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: {
      success: false,
      message: 'Too many password reset attempts, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'Too many password reset attempts, please try again later.');
    },
  });

  /**
   * Email verification rate limiter
   */
  static emailVerification = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour
    message: {
      success: false,
      message: 'Too many email verification attempts, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Email verification rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'Too many email verification attempts, please try again later.');
    },
  });

  /**
   * File upload rate limiter
   */
  static fileUpload = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
      success: false,
      message: 'Too many file uploads, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`File upload rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'Too many file uploads, please try again later.');
    },
  });

  /**
   * API rate limiter for authenticated users
   */
  static api = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window for authenticated users
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return (req as any).user?.id || req.ip;
    },
    message: {
      success: false,
      message: 'API rate limit exceeded, please try again later.',
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const identifier = (req as any).user?.id || req.ip;
      logger.warn(`API rate limit exceeded for: ${identifier}, Path: ${req.path}`);
      ResponseUtils.tooManyRequests(res, 'API rate limit exceeded, please try again later.');
    },
  });

  /**
   * Create custom rate limiter
   */
  static custom(options: {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
  }) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: {
        success: false,
        message: options.message || 'Rate limit exceeded',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        timestamp: new Date().toISOString(),
      },
      keyGenerator: options.keyGenerator,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        logger.warn(`Custom rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        ResponseUtils.tooManyRequests(res, options.message || 'Rate limit exceeded');
      },
    });
  }

  /**
   * Create rate limiter with different limits for authenticated vs anonymous users
   */
  static tiered(options: {
    anonymousWindowMs: number;
    anonymousMax: number;
    authenticatedWindowMs: number;
    authenticatedMax: number;
    message?: string;
  }) {
    return rateLimit({
      keyGenerator: (req: Request) => {
        return (req as any).user ? `auth:${(req as any).user.id}` : `anon:${req.ip}`;
      },
      skip: (req: Request) => {
        // Don't skip, but use different limits
        return false;
      },
      windowMs: (req: Request) => {
        return (req as any).user ? options.authenticatedWindowMs : options.anonymousWindowMs;
      },
      max: (req: Request) => {
        return (req as any).user ? options.authenticatedMax : options.anonymousMax;
      },
      message: {
        success: false,
        message: options.message || 'Rate limit exceeded',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        const userType = (req as any).user ? 'authenticated' : 'anonymous';
        logger.warn(`Tiered rate limit exceeded for ${userType} user: ${req.ip}, Path: ${req.path}`);
        ResponseUtils.tooManyRequests(res, options.message || 'Rate limit exceeded');
      },
    });
  }

  /**
   * Rate limiter with progressive delays
   */
  static progressive(options: {
    baseWindowMs: number;
    baseMax: number;
    multiplier: number;
    maxWindowMs: number;
    message?: string;
  }) {
    const store = new Map();
    
    return rateLimit({
      keyGenerator: (req: Request) => req.ip,
      windowMs: options.baseWindowMs,
      max: options.max,
      handler: (req: Request, res: Response) => {
        const key = req.ip;
        const now = Date.now();
        const record = store.get(key);
        
        if (record) {
          const violationCount = record.violationCount + 1;
          const windowMs = Math.min(
            options.baseWindowMs * Math.pow(options.multiplier, violationCount),
            options.maxWindowMs
          );
          
          store.set(key, {
            violationCount,
            windowMs,
            lastViolation: now,
          });
          
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
        } else {
          store.set(key, {
            violationCount: 1,
            windowMs: options.baseWindowMs,
            lastViolation: now,
          });
        }
        
        logger.warn(`Progressive rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        ResponseUtils.tooManyRequests(res, options.message || 'Rate limit exceeded');
      },
      onLimitReached: (req: Request, res: Response) => {
        const key = req.ip;
        const record = store.get(key);
        
        if (record && Date.now() - record.lastViolation > options.baseWindowMs) {
          // Reset violation count if window has passed
          store.delete(key);
        }
      },
    });
  }

  /**
   * Rate limiter with sliding window
   */
  static slidingWindow(options: {
    windowMs: number;
    max: number;
    granularityMs?: number;
    message?: string;
  }) {
    const granularity = options.granularityMs || 60000; // 1 minute default
    const store = new Map();
    
    return rateLimit({
      keyGenerator: (req: Request) => req.ip,
      windowMs: options.windowMs,
      max: options.max,
      skip: (req: Request) => {
        const key = req.ip;
        const now = Date.now();
        const record = store.get(key);
        
        if (!record) {
          store.set(key, { requests: [] });
          return false;
        }
        
        // Remove old requests outside the window
        record.requests = record.requests.filter((timestamp: number) => 
          now - timestamp < options.windowMs
        );
        
        return record.requests.length >= options.max;
      },
      handler: (req: Request, res: Response) => {
        const key = req.ip;
        const now = Date.now();
        const record = store.get(key);
        
        if (record) {
          record.requests.push(now);
        }
        
        logger.warn(`Sliding window rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        ResponseUtils.tooManyRequests(res, options.message || 'Rate limit exceeded');
      },
    });
  }
}
