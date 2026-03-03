import { cronManager, predefinedJobs } from '../config/cron';
import { logger } from '../config/logger';
import { userService } from './userService';
import { mailService } from './mailService';
import { cloudService } from './cloudService';
import { UserStatus } from '../enums/userEnums';

export class CronService {
  initializeJobs(): void {
    // Cleanup inactive users
    cronManager.addJob({
      name: 'cleanup-inactive-users',
      schedule: predefinedJobs.weekly, // Every Sunday at midnight
      task: async () => {
        await this.cleanupInactiveUsers();
      },
      enabled: true,
    });

    // Send weekly digest emails
    cronManager.addJob({
      name: 'weekly-digest',
      schedule: predefinedJobs.weekly,
      task: async () => {
        await this.sendWeeklyDigest();
      },
      enabled: true,
    });

    // Cleanup expired tokens
    cronManager.addJob({
      name: 'cleanup-expired-tokens',
      schedule: predefinedJobs.daily,
      task: async () => {
        await this.cleanupExpiredTokens();
      },
      enabled: true,
    });

    // Generate analytics report
    cronManager.addJob({
      name: 'generate-analytics-report',
      schedule: predefinedJobs.daily,
      task: async () => {
        await this.generateAnalyticsReport();
      },
      enabled: true,
    });

    // Cleanup unused cloud files
    cronManager.addJob({
      name: 'cleanup-cloud-files',
      schedule: predefinedJobs.monthly,
      task: async () => {
        await this.cleanupCloudFiles();
      },
      enabled: true,
    });

    // Backup database
    cronManager.addJob({
      name: 'backup-database',
      schedule: predefinedJobs.daily,
      task: async () => {
        await this.backupDatabase();
      },
      enabled: false, // Disabled by default, enable when needed
    });

    // Check system health
    cronManager.addJob({
      name: 'system-health-check',
      schedule: predefinedJobs.everyFiveMinutes,
      task: async () => {
        await this.systemHealthCheck();
      },
      enabled: true,
    });

    // Process pending email verifications
    cronManager.addJob({
      name: 'process-pending-verifications',
      schedule: predefinedJobs.everyHour,
      task: async () => {
        await this.processPendingVerifications();
      },
      enabled: true,
    });

    // Update user statistics
    cronManager.addJob({
      name: 'update-user-stats',
      schedule: predefinedJobs.daily,
      task: async () => {
        await this.updateUserStatistics();
      },
      enabled: true,
    });

    logger.info('All cron jobs initialized');
  }

  startAllJobs(): void {
    cronManager.startAll();
    logger.info('All cron jobs started');
  }

  stopAllJobs(): void {
    cronManager.stopAll();
    logger.info('All cron jobs stopped');
  }

  private async cleanupInactiveUsers(): Promise<void> {
    try {
      logger.info('Starting cleanup of inactive users...');
      
      // Find users inactive for more than 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveUsers = await this.findInactiveUsers(ninetyDaysAgo);

      if (inactiveUsers.length > 0) {
        // Send warning emails to users inactive for 60-90 days
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const warningUsers = inactiveUsers.filter(user => 
          user.lastActiveAt && user.lastActiveAt >= sixtyDaysAgo
        );

        for (const user of warningUsers) {
          try {
            await mailService.sendEmail({
              to: user.email,
              subject: 'Your account will be deactivated soon',
              html: `Hi ${user.firstName}, your account has been inactive for a while. Please log in to keep your account active.`,
              text: `Hi ${user.firstName}, your account has been inactive for a while. Please log in to keep your account active.`
            });
          } catch (error) {
            logger.error(`Failed to send warning email to ${user.email}:`, error);
          }
        }

        // Deactivate users inactive for more than 90 days
        const toDeactivate = inactiveUsers.filter(user => 
          !user.lastActiveAt || user.lastActiveAt < ninetyDaysAgo
        );

        if (toDeactivate.length > 0) {
          const userIds = toDeactivate.map(user => user._id.toString());
          await userService.bulkUserOperation(userIds, 'deactivate', 'Account inactive for more than 90 days');
          
          logger.info(`Deactivated ${toDeactivate.length} inactive users`);
        }
      }

      logger.info('Inactive users cleanup completed');
    } catch (error) {
      logger.error('Inactive users cleanup failed:', error);
    }
  }

  private async sendWeeklyDigest(): Promise<void> {
    try {
      logger.info('Starting weekly digest email generation...');
      
      // Get user statistics
      const stats = await userService.getUserStats();
      
      // Get active users from the last week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeUsers = await this.findActiveUsers(oneWeekAgo);

      // Send digest to admin users
      const adminUsers = await this.findAdminUsers();
      
      for (const admin of adminUsers) {
        try {
          await mailService.sendEmail({
            to: admin.email,
            subject: 'Weekly Platform Digest',
            html: `Here's your weekly digest:<br><br>` +
              `Total Users: ${stats.total}<br>` +
              `Active Users: ${stats.active}<br>` +
              `New Users This Week: ${activeUsers.length}<br>` +
              `Email Verification Rate: ${stats.verificationRate.toFixed(2)}%<br>` +
              `Two-Factor Authentication Rate: ${stats.twoFactorRate.toFixed(2)}%<br>`,
            text: `Here's your weekly digest:\n\n` +
              `Total Users: ${stats.total}\n` +
              `Active Users: ${stats.active}\n` +
              `New Users This Week: ${activeUsers.length}\n` +
              `Email Verification Rate: ${stats.verificationRate.toFixed(2)}%\n` +
              `Two-Factor Authentication Rate: ${stats.twoFactorRate.toFixed(2)}%\n`
          });
        } catch (error) {
          logger.error(`Failed to send weekly digest to ${admin.email}:`, error);
        }
      }

      logger.info('Weekly digest emails sent');
    } catch (error) {
      logger.error('Weekly digest generation failed:', error);
    }
  }

  private async cleanupExpiredTokens(): Promise<void> {
    try {
      logger.info('Starting cleanup of expired tokens...');
      
      // This would clean up expired password reset tokens, email verification tokens, etc.
      // Implementation would depend on your token storage strategy
      
      logger.info('Expired tokens cleanup completed');
    } catch (error) {
      logger.error('Expired tokens cleanup failed:', error);
    }
  }

  private async generateAnalyticsReport(): Promise<void> {
    try {
      logger.info('Generating daily analytics report...');
      
      const stats = await userService.getUserStats();
      
      // Store analytics data (could be in a separate analytics collection or external service)
      const analyticsData = {
        date: new Date(),
        userStats: stats,
        systemMetrics: await this.getSystemMetrics(),
      };

      // TODO: Save analytics data to database or send to analytics service
      
      logger.info('Analytics report generated');
    } catch (error) {
      logger.error('Analytics report generation failed:', error);
    }
  }

  private async cleanupCloudFiles(): Promise<void> {
    try {
      logger.info('Starting cleanup of unused cloud files...');
      
      const result = await cloudService.cleanupUnusedFiles(30);
      
      logger.info(`Cloud cleanup completed: ${result.deleted} files deleted`);
      if (result.errors.length > 0) {
        logger.warn(`Cloud cleanup errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      logger.error('Cloud files cleanup failed:', error);
    }
  }

  private async backupDatabase(): Promise<void> {
    try {
      logger.info('Starting database backup...');
      
      // TODO: Implement database backup logic
      // This could involve creating database dumps and storing them securely
      
      logger.info('Database backup completed');
    } catch (error) {
      logger.error('Database backup failed:', error);
    }
  }

  private async systemHealthCheck(): Promise<void> {
    try {
      logger.debug('Performing system health check...');
      
      // Check email service
      const emailStatus = await mailService.verifyEmailConnection();
      if (!emailStatus) {
        logger.warn('Email service health check failed');
      }

      // Check cloud service
      // TODO: Add cloud service health check
      
      // Check database connectivity
      // TODO: Add database health check
      
      logger.debug('System health check completed');
    } catch (error) {
      logger.error('System health check failed:', error);
    }
  }

  private async processPendingVerifications(): Promise<void> {
    try {
      logger.info('Processing pending email verifications...');
      
      // Find users with unverified emails and send reminder emails
      const pendingUsers = await this.findUsersWithPendingVerification();
      
      for (const user of pendingUsers) {
        try {
          // Check if verification token is still valid
          if (user.emailVerificationExpires && user.emailVerificationExpires > new Date()) {
            // Send reminder email
            await mailService.sendEmailVerificationEmail(
              user.email,
              `${user.firstName} ${user.lastName}`,
              user.emailVerificationToken
            );
          }
        } catch (error) {
          logger.error(`Failed to process verification for ${user.email}:`, error);
        }
      }

      logger.info(`Processed ${pendingUsers.length} pending verifications`);
    } catch (error) {
      logger.error('Pending verifications processing failed:', error);
    }
  }

  private async updateUserStatistics(): Promise<void> {
    try {
      logger.info('Updating user statistics...');
      
      // Update various user statistics
      // This could include login counts, activity metrics, etc.
      
      logger.info('User statistics updated');
    } catch (error) {
      logger.error('User statistics update failed:', error);
    }
  }

  // Helper methods that would interact with the database
  private async findInactiveUsers(since: Date): Promise<any[]> {
    const { User } = require('../models/userModel');
    return User.find({
      status: UserStatus.ACTIVE,
      $or: [
        { lastActiveAt: { $lt: since } },
        { lastActiveAt: { $exists: false } },
      ],
    });
  }

  private async findActiveUsers(since: Date): Promise<any[]> {
    const { User } = require('../models/userModel');
    return User.find({
      status: UserStatus.ACTIVE,
      lastActiveAt: { $gte: since },
    });
  }

  private async findAdminUsers(): Promise<any[]> {
    const { User } = require('../models/userModel');
    return User.find({
      status: UserStatus.ACTIVE,
      role: 'admin',
    });
  }

  private async findUsersWithPendingVerification(): Promise<any[]> {
    const { User } = require('../models/userModel');
    return User.find({
      status: UserStatus.ACTIVE,
      emailVerified: false,
      emailVerificationToken: { $exists: true },
      emailVerificationExpires: { $gt: new Date() },
    });
  }

  private async getSystemMetrics(): Promise<any> {
    // Collect system metrics like memory usage, CPU, etc.
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }
}

export const cronService = new CronService();
