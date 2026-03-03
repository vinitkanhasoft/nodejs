import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { serverConfig } from '../config/server';

export class HashUtils {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, serverConfig.security.bcryptRounds);
  }

  /**
   * Compare a password with its hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a random hash
   */
  static generateRandomHash(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a SHA-256 hash
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a MD5 hash (not recommended for passwords)
   */
  static md5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Generate a HMAC-SHA256 hash
   */
  static hmacSha256(data: string, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a numeric hash
   */
  static numericHash(data: string, max: number = 1000000): number {
    const hash = this.sha256(data);
    return parseInt(hash.substring(0, 8), 16) % max;
  }

  /**
   * Generate a consistent color hash for a string
   */
  static generateColorHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Create a hash for file verification
   */
  static async createFileHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate a short hash for URLs
   */
  static generateShortHash(length: number = 8): string {
    return crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '').substring(0, length);
  }

  /**
   * Hash an object consistently
   */
  static hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return this.sha256(str);
  }

  /**
   * Generate a peppered hash (additional salt)
   */
  static async pepperedHash(data: string, pepper: string): Promise<string> {
    const pepperedData = data + pepper;
    return this.sha256(pepperedData);
  }

  /**
   * Verify a peppered hash
   */
  static async verifyPepperedHash(data: string, pepper: string, hash: string): Promise<boolean> {
    const expectedHash = await this.pepperedHash(data, pepper);
    return expectedHash === hash;
  }
}
