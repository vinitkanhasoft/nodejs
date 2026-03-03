import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IJWTpayload } from '../types/auth';
import { UserRole } from '../enums/userEnums';

export class TokenUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private static readonly JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
  private static readonly JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: Omit<IJWTpayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRE,
      issuer: 'your-app',
      audience: 'your-app-users',
    } as jwt.SignOptions);
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { sub: userId, type: 'refresh' },
      this.JWT_REFRESH_SECRET,
      {
        expiresIn: this.JWT_REFRESH_EXPIRE,
        issuer: 'your-app',
        audience: 'your-app-users',
      } as jwt.SignOptions
    );
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): IJWTpayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'your-app',
        audience: 'your-app-users',
      }) as IJWTpayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify JWT refresh token
   */
  static verifyRefreshToken(token: string): { sub: string; type: string } {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'your-app',
        audience: 'your-app-users',
      }) as { sub: string; type: string };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { sub: userId, type: 'password_reset' },
      this.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { sub: string; type: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET) as { sub: string; type: string };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Password reset token expired');
      } else {
        throw new Error('Invalid password reset token');
      }
    }
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(userId: string): string {
    return jwt.sign(
      { sub: userId, type: 'email_verification' },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): { sub: string; type: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET) as { sub: string; type: string };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Email verification token expired');
      } else {
        throw new Error('Invalid email verification token');
      }
    }
  }

  /**
   * Generate API key token
   */
  static generateApiKeyToken(payload: any): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '1y',
      issuer: 'your-app',
      audience: 'api',
    });
  }

  /**
   * Verify API key token
   */
  static verifyApiKeyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'your-app',
        audience: 'api',
      });
    } catch (error) {
      throw new Error('Invalid API key');
    }
  }

  /**
   * Generate random token
   */
  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate URL-safe token
   */
  static generateUrlSafeToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * Create a token hash for storage
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify token against stored hash
   */
  static verifyTokenHash(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    return tokenHash === hash;
  }

  /**
   * Generate session token
   */
  static generateSessionToken(userId: string, sessionId: string): string {
    return jwt.sign(
      { sub: userId, sessionId, type: 'session' },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verify session token
   */
  static verifySessionToken(token: string): { sub: string; sessionId: string; type: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET) as { sub: string; sessionId: string; type: string };
    } catch (error) {
      throw new Error('Invalid session token');
    }
  }

  /**
   * Extract bearer token from authorization header
   */
  static extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }

  /**
   * Get token payload without verification
   */
  static getTokenPayload(token: string): any {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== 'object') return null;
    return decoded;
  }

  /**
   * Refresh access token using refresh token
   */
  static refreshAccessToken(refreshToken: string): string {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    // Get user data to create new access token
    // This would typically involve a database lookup
    const payload: Omit<IJWTpayload, 'iat' | 'exp'> = {
      sub: decoded.sub,
      email: '', // Would get from database
      role: UserRole.USER, // Would get from database
      permissions: [], // Would get from database
    };
    
    return this.generateAccessToken(payload);
  }
}
