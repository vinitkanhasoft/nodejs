import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { mailService } from '../services/mailService';
import { notificationService } from '../services/notificationService';
import { IAuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/errorMiddleware';
import { HTTP_STATUS } from '../constants/status';
import { SUCCESS_MESSAGES } from '../constants/messages';
import { logger } from '../config/logger';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, firstName, lastName } = req.body;
    
    const result = await authService.register(req.body);
    
    // Send welcome email
    try {
      await mailService.sendWelcomeEmail(email, `${firstName} ${lastName}`);
    } catch (emailError) {
      logger.warn('Failed to send welcome email:', emailError);
    }

    // Send notification
    try {
      await notificationService.sendEmailNotification(result.user.id, 'welcome', {
        userName: `${firstName} ${lastName}`,
        userEmail: email,
      });
    } catch (notificationError) {
      logger.warn('Failed to send notification:', notificationError);
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_CREATED,
      data: result,
      statusCode: HTTP_STATUS.CREATED,
      timestamp: new Date().toISOString(),
    });
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      data: result,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.refreshToken(req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  logout = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const userId = req.user!.id;
    
    await authService.logout(userId, refreshToken);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  logoutAll = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    await authService.logoutAllSessions(userId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'All sessions logged out successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await authService.requestPasswordReset(req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset link sent to your email',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  confirmPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await authService.confirmPasswordReset(req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PASSWORD_UPDATED,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  changePassword = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    await authService.changePassword(userId, req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PASSWORD_UPDATED,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await authService.verifyEmail(req.body.token);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email verified successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  resendVerificationEmail = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user!;
    
    // Generate new verification token
    const { User } = require('../models/userModel');
    const userModel = await User.findById(user.id);
    
    if (!userModel) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (userModel.emailVerified) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email already verified',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const verificationToken = userModel.generateEmailVerificationToken();
    await userModel.save();

    // Send verification email
    await mailService.sendEmailVerificationEmail(
      userModel.email,
      `${userModel.firstName} ${userModel.lastName}`,
      verificationToken
    );
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Verification email sent',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getProfile = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    const { User } = require('../models/userModel');
    const user = await User.findById(userId).select('-password -refreshTokens -twoFactorSecret');
    
    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  updateProfile = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    const { userService } = require('../services/userService');
    const updatedUser = await userService.updateUser(userId, req.body);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PROFILE_UPDATED,
      data: updatedUser.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  enableTwoFactor = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    // This would implement 2FA setup logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Two-factor authentication setup initiated',
      data: {
        secret: 'placeholder-secret',
        qrCode: 'placeholder-qr-code',
        backupCodes: ['123456', '789012'],
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  verifyTwoFactor = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { token } = req.body;
    
    // This would implement 2FA verification logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Two-factor authentication verified',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  disableTwoFactor = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { password } = req.body;
    
    // This would implement 2FA disable logic
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Two-factor authentication disabled',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getSessions = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    // This would return active sessions for the user
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: {
        sessions: [],
        total: 0,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  revokeSession = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    
    // This would revoke a specific session
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Session revoked successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getLoginHistory = asyncHandler(async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    
    // This would return login history for the user
    // For now, returning a placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login history retrieved successfully',
      data: {
        history: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });
}

export const authController = new AuthController();
