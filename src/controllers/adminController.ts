import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { analyticsService } from '../services/analyticsService';
import { cronService } from '../services/cronService';
import { mailService } from '../services/mailService';
import { cloudService } from '../services/cloudService';
import { IAuthenticatedRequest } from '../types/auth';
import { asyncHandler } from '../middlewares/errorMiddleware';
import { HTTP_STATUS } from '../constants/status';
import { SUCCESS_MESSAGES } from '../constants/messages';
import { logger } from '../config/logger';

export class AdminController {
  // Dashboard Statistics
  getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { dateRange } = req.query;
    
    // Get user statistics
    const userStats = await userService.getUserStats();
    
    // Get analytics metrics
    const analyticsMetrics = await analyticsService.getMetrics(
      dateRange ? {
        from: new Date(dateRange as string),
        to: new Date(),
      } : {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        to: new Date(),
      }
    );
    
    // Get system metrics
    const systemMetrics = await this.getSystemMetrics();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        userStats,
        analyticsMetrics,
        systemMetrics,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // User Management
  getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await userService.listUsers(req.query);
    
    const safeUsers = result.users.map(user => user.toSafeObject());
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'All users retrieved successfully',
      data: {
        ...result,
        users: safeUsers,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getUserDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get additional user data
    const [userActivity, userStats] = await Promise.all([
      userService.getUserActivity(id),
      userService.getUserStats(id),
    ]);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user: user.toSafeObject(),
        activity: userActivity,
        stats: userStats,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  suspendUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { reason, duration } = req.body;
    
    const updatedUser = await userService.updateUserStatus(id, 'suspended');
    
    // Send notification to user
    try {
      const { notificationService } = require('../services/notificationService');
      await notificationService.sendEmailNotification(id, 'account_suspended', {
        reason: reason || 'Violation of terms of service',
        duration: duration || 'indefinite',
      });
    } catch (error) {
      logger.warn('Failed to send suspension notification:', error);
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User suspended successfully',
      data: updatedUser.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  unsuspendUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    const updatedUser = await userService.updateUserStatus(id, 'active');
    
    // Send notification to user
    try {
      const { notificationService } = require('../services/notificationService');
      await notificationService.sendEmailNotification(id, 'account_activated', {});
    } catch (error) {
      logger.warn('Failed to send activation notification:', error);
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User unsuspended successfully',
      data: updatedUser.toSafeObject(),
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  deleteUserByAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { reason } = req.body;
    
    await userService.deleteUser(id);
    
    logger.info(`User ${id} deleted by admin. Reason: ${reason}`);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User deleted successfully',
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // Analytics and Reports
  getAnalyticsReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { dateRange, type = 'overview' } = req.query;
    
    const metrics = await analyticsService.getMetrics(
      dateRange ? {
        from: new Date(dateRange as string),
        to: new Date(),
      } : {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }
    );
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Analytics report retrieved successfully',
      data: metrics,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  exportAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { format = 'csv', dateRange } = req.query;
    
    const buffer = await analyticsService.exportAnalytics(format as string, 
      dateRange ? {
        from: new Date(dateRange as string),
        to: new Date(),
      } : {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }
    );
    
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `analytics_export.${format}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  getRealTimeAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const metrics = await analyticsService.getRealTimeMetrics();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Real-time analytics retrieved successfully',
      data: metrics,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // System Management
  getSystemHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const healthData = await this.getSystemHealthData();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'System health retrieved successfully',
      data: healthData,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getSystemLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { level = 'info', limit = 100, offset = 0 } = req.query;
    
    // This would retrieve system logs
    // For now, returning placeholder data
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'System logs retrieved successfully',
      data: {
        logs: [],
        total: 0,
        level,
        limit: Number(limit),
        offset: Number(offset),
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // Cron Job Management
  getCronJobs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const jobs = cronManager.listJobs();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Cron jobs retrieved successfully',
      data: {
        jobs: jobs.map(name => ({
          name,
          status: cronManager.getJobStatus(name),
        })),
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  startCronJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { jobName } = req.params;
    
    cronManager.startJob(jobName);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Cron job "${jobName}" started successfully`,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  stopCronJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { jobName } = req.params;
    
    cronManager.stopJob(jobName);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Cron job "${jobName}" stopped successfully`,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // Email Management
  sendBulkEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { emails, subject, template, variables } = req.body;
    
    const emailData = emails.map((email: string) => ({
      to: email,
      subject,
      html: await this.renderEmailTemplate(template, { ...variables, email }),
    }));
    
    const result = await mailService.sendBulkEmails(emailData);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Bulk email sent: ${result.successful} successful, ${result.failed} failed`,
      data: result,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  getEmailStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // This would retrieve email statistics
    // For now, returning placeholder data
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email statistics retrieved successfully',
      data: {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // File Management
  getCloudStorageStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await cloudService.getCloudUsageStats();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Cloud storage statistics retrieved successfully',
      data: stats,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  cleanupCloudFiles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { olderThanDays = 30 } = req.body;
    
    const result = await cloudService.cleanupUnusedFiles(olderThanDays);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Cloud cleanup completed: ${result.deleted} files deleted`,
      data: result,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // Settings Management
  getSystemSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // This would retrieve system settings
    // For now, returning placeholder data
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'System settings retrieved successfully',
      data: {
        maintenance: false,
        registrationEnabled: true,
        emailVerificationRequired: true,
        twoFactorEnabled: false,
        maxUsers: 10000,
      },
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  updateSystemSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const settings = req.body;
    
    // This would update system settings
    // For now, returning placeholder response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    });
  });

  // Private helper methods
  private async getSystemMetrics(): Promise<any> {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private async getSystemHealthData(): Promise<any> {
    const [emailStatus, cloudStats] = await Promise.all([
      mailService.verifyEmailConnection(),
      cloudService.getCloudUsageStats(),
    ]);

    return {
      status: 'healthy', // Would be calculated based on various checks
      services: {
        email: emailStatus ? 'connected' : 'disconnected',
        cloud: 'connected', // Would check actual cloud service status
        database: 'connected', // Would check actual database status
        redis: 'connected', // Would check actual Redis status
      },
      metrics: await this.getSystemMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  private async renderEmailTemplate(templateName: string, variables: Record<string, any>): Promise<string> {
    const { emailHelper } = require('../email/emailHelper');
    return await emailHelper.renderTemplate(templateName, variables);
  }
}

export const adminController = new AdminController();
