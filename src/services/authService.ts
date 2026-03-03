import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IAuthUser, ILoginRequest, IRegisterRequest, IAuthResponse, IRefreshTokenRequest, IPasswordResetRequest, IPasswordResetConfirmRequest, IChangePasswordRequest, IJWTpayload } from '../types/auth';
import { IUser, IUserCreateInput } from '../types/user';
import { UserRole, UserStatus, LoginMethod, AccountType } from '../enums/userEnums';
import { serverConfig } from '../config/server';
import { logger } from '../config/logger';
import { AppError } from '../middlewares/errorMiddleware';
import { ERROR_MESSAGES } from '../constants/messages';
import { HTTP_STATUS } from '../constants/status';

export class AuthService {
  private generateTokens(user: IAuthUser): { accessToken: string; refreshToken: string; expiresIn: number } {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    const jwtExpire = process.env.JWT_EXPIRE || '7d';
    const jwtRefreshExpire = process.env.JWT_REFRESH_EXPIRE || '30d';

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets are not defined');
    }

    const payload: IJWTpayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days default
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpire } as jwt.SignOptions);
    const refreshToken = jwt.sign({ sub: user.id }, jwtRefreshSecret, { expiresIn: jwtRefreshExpire } as jwt.SignOptions);
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    return { accessToken, refreshToken, expiresIn };
  }

  async register(userData: IRegisterRequest): Promise<IAuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new AppError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, serverConfig.security.bcryptRounds);

      // Create user
      const newUserInput: IUserCreateInput = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        role: UserRole.USER,
        accountType: AccountType.PERSONAL,
        loginMethod: LoginMethod.EMAIL_PASSWORD,
      };

      const newUser = await this.createUser(newUserInput);

      // Generate email verification token
      const verificationToken = newUser.generateEmailVerificationToken();
      await newUser.save();

      // TODO: Send verification email

      const authUser: IAuthUser = {
        id: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        permissions: this.getPermissionsForRole(newUser.role),
      };

      const tokens = this.generateTokens(authUser);

      logger.info(`User registered successfully: ${userData.email}`);

      return {
        user: authUser,
        ...tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  async login(loginData: ILoginRequest): Promise<IAuthResponse> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(loginData.email);
      if (!user) {
        throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        throw new AppError(ERROR_MESSAGES.ACCOUNT_SUSPENDED, HTTP_STATUS.FORBIDDEN, 'ACCOUNT_SUSPENDED');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        // Update failed login attempts
        user.stats.failedLoginAttempts += 1;
        if (user.stats.failedLoginAttempts >= 5) {
          user.stats.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        }
        await user.save();
        
        throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
      }

      // Reset failed login attempts on successful login
      user.stats.failedLoginAttempts = 0;
      user.stats.accountLockedUntil = undefined;
      user.stats.loginCount += 1;
      user.stats.lastLoginAt = new Date();
      user.lastActiveAt = new Date();
      await user.save();

      const authUser: IAuthUser = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions: this.getPermissionsForRole(user.role),
      };

      const tokens = this.generateTokens(authUser);

      // Store refresh token
      user.refreshTokens.push(tokens.refreshToken);
      await user.save();

      logger.info(`User logged in successfully: ${loginData.email}`);

      return {
        user: authUser,
        ...tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  async refreshToken(refreshData: IRefreshTokenRequest): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!jwtRefreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshData.refreshToken, jwtRefreshSecret) as any;
      const userId = decoded.sub;

      // Find user
      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
      }

      // Check if refresh token exists for user
      if (!user.refreshTokens.includes(refreshData.refreshToken)) {
        // Remove all refresh tokens for this user (possible token leak)
        user.refreshTokens = [];
        await user.save();
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
      }

      const authUser: IAuthUser = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions: this.getPermissionsForRole(user.role),
      };

      const tokens = this.generateTokens(authUser);

      // Update refresh tokens
      const tokenIndex = user.refreshTokens.indexOf(refreshData.refreshToken);
      user.refreshTokens[tokenIndex] = tokens.refreshToken;
      await user.save();

      logger.info(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        return; // User doesn't exist, but logout should still succeed
      }

      // Remove refresh token
      const tokenIndex = user.refreshTokens.indexOf(refreshToken);
      if (tokenIndex > -1) {
        user.refreshTokens.splice(tokenIndex, 1);
        await user.save();
      }

      logger.info(`User logged out: ${user.email}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  async logoutAllSessions(userId: string): Promise<void> {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        return;
      }

      // Clear all refresh tokens
      user.refreshTokens = [];
      await user.save();

      logger.info(`All sessions logged out for user: ${user.email}`);
    } catch (error) {
      logger.error('Logout all sessions failed:', error);
      throw error;
    }
  }

  async requestPasswordReset(resetData: IPasswordResetRequest): Promise<void> {
    try {
      const user = await this.findUserByEmail(resetData.email);
      if (!user) {
        // Don't reveal if email exists or not
        return;
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // TODO: Send password reset email
      logger.info(`Password reset requested for: ${resetData.email}`);
    } catch (error) {
      logger.error('Password reset request failed:', error);
      throw error;
    }
  }

  async confirmPasswordReset(resetData: IPasswordResetConfirmRequest): Promise<void> {
    try {
      const user = await this.findUserByPasswordResetToken(resetData.token);
      if (!user) {
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST, 'INVALID_RESET_TOKEN');
      }

      // Check if token is expired
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST, 'TOKEN_EXPIRED');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(resetData.newPassword, serverConfig.security.bcryptRounds);

      // Update password and clear reset token
      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.stats.passwordChangedAt = new Date();
      await user.save();

      logger.info(`Password reset completed for: ${user.email}`);
    } catch (error) {
      logger.error('Password reset confirmation failed:', error);
      throw error;
    }
  }

  async changePassword(userId: string, passwordData: IChangePasswordRequest): Promise<void> {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(passwordData.currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AppError(ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT, HTTP_STATUS.BAD_REQUEST, 'INVALID_CURRENT_PASSWORD');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(passwordData.newPassword, serverConfig.security.bcryptRounds);

      // Update password
      user.password = hashedPassword;
      user.stats.passwordChangedAt = new Date();
      user.refreshTokens = []; // Invalidate all sessions
      await user.save();

      logger.info(`Password changed for: ${user.email}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const user = await this.findUserByEmailVerificationToken(token);
      if (!user) {
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST, 'INVALID_VERIFICATION_TOKEN');
      }

      // Check if token is expired
      if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
        throw new AppError(ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.BAD_REQUEST, 'TOKEN_EXPIRED');
      }

      // Verify email
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.stats.emailVerifiedAt = new Date();
      await user.save();

      logger.info(`Email verified for: ${user.email}`);
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  private getPermissionsForRole(role: UserRole): string[] {
    const { ROLE_PERMISSIONS } = require('../constants/roles');
    return ROLE_PERMISSIONS[role] || [];
  }

  // Helper methods that would interact with the database
  private async findUserByEmail(email: string): Promise<IUser | null> {
    // This would be implemented with the actual User model
    const { User } = require('../models/userModel');
    return User.findOne({ email, status: { $ne: UserStatus.DELETED } });
  }

  private async findUserById(id: string): Promise<IUser | null> {
    const { User } = require('../models/userModel');
    return User.findOne({ _id: id, status: { $ne: UserStatus.DELETED } });
  }

  private async findUserByPasswordResetToken(token: string): Promise<IUser | null> {
    const { User } = require('../models/userModel');
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
      status: { $ne: UserStatus.DELETED },
    });
  }

  private async findUserByEmailVerificationToken(token: string): Promise<IUser | null> {
    const { User } = require('../models/userModel');
    return User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
      status: { $ne: UserStatus.DELETED },
    });
  }

  private async createUser(userData: IUserCreateInput): Promise<IUser> {
    const { User } = require('../models/userModel');
    return User.create(userData);
  }
}

export const authService = new AuthService();
