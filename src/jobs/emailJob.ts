import { logger } from '../config/logger';
import { mailService } from '../services/mailService';
import { notificationService } from '../services/notificationService';
import { userService } from '../services/userService';
import { UserStatus } from '../enums/userEnums';

export class EmailJob {
  async sendDailyDigest(): Promise<void> {
    try {
      logger.info('Starting daily digest email job...');
      
      // Get user statistics
      const stats = await userService.getUserStats();
      
      // Get active users from the last day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers = await this.findActiveUsers(oneDayAgo);

      // Send digest to admin users
      const adminUsers = await this.findAdminUsers();
      
      for (const admin of adminUsers) {
        try {
          await mailService.sendEmail({
            to: admin.email,
            subject: 'Daily Platform Digest',
            html: this.generateDailyDigestHTML(stats, activeUsers.length),
            text: this.generateDailyDigestText(stats, activeUsers.length),
          });
        } catch (error) {
          logger.error(`Failed to send daily digest to ${admin.email}:`, error);
        }
      }

      logger.info('Daily digest email job completed');
    } catch (error) {
      logger.error('Daily digest email job failed:', error);
    }
  }

  async sendWeeklyReport(): Promise<void> {
    try {
      logger.info('Starting weekly report email job...');
      
      // Get weekly statistics
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const stats = await userService.getUserStats();
      const activeUsers = await this.findActiveUsers(oneWeekAgo);

      // Send report to admin users
      const adminUsers = await this.findAdminUsers();
      
      for (const admin of adminUsers) {
        try {
          await mailService.sendEmail({
            to: admin.email,
            subject: 'Weekly Platform Report',
            html: this.generateWeeklyReportHTML(stats, activeUsers.length),
            text: this.generateWeeklyReportText(stats, activeUsers.length),
          });
        } catch (error) {
          logger.error(`Failed to send weekly report to ${admin.email}:`, error);
        }
      }

      logger.info('Weekly report email job completed');
    } catch (error) {
      logger.error('Weekly report email job failed:', error);
    }
  }

  async processPendingEmails(): Promise<void> {
    try {
      logger.info('Starting pending emails processing...');
      
      // This would process emails from a queue
      // Implementation depends on your email queue strategy
      
      logger.info('Pending emails processing completed');
    } catch (error) {
      logger.error('Pending emails processing failed:', error);
    }
  }

  async sendReminderEmails(): Promise<void> {
    try {
      logger.info('Starting reminder emails job...');
      
      // Find users who need reminders
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
          logger.error(`Failed to send reminder email to ${user.email}:`, error);
        }
      }

      logger.info(`Reminder emails job completed: ${pendingUsers.length} emails sent`);
    } catch (error) {
      logger.error('Reminder emails job failed:', error);
    }
  }

  async retryFailedEmails(): Promise<void> {
    try {
      logger.info('Starting failed emails retry job...');
      
      // This would retry failed email deliveries
      // Implementation depends on your email tracking strategy
      
      logger.info('Failed emails retry job completed');
    } catch (error) {
      logger.error('Failed emails retry job failed:', error);
    }
  }

  async cleanupEmailLogs(): Promise<void> {
    try {
      logger.info('Starting email logs cleanup...');
      
      // This would clean up old email logs
      // Implementation depends on your email logging strategy
      
      logger.info('Email logs cleanup completed');
    } catch (error) {
      logger.error('Email logs cleanup failed:', error);
    }
  }

  // Helper methods
  private generateDailyDigestHTML(stats: any, activeUsersCount: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Daily Platform Digest</h2>
        <p>Here's your daily summary:</p>
        <ul>
          <li>Total Users: ${stats.total}</li>
          <li>Active Users: ${stats.active}</li>
          <li>Active Today: ${activeUsersCount}</li>
          <li>Email Verification Rate: ${stats.verificationRate.toFixed(2)}%</li>
          <li>Two-Factor Authentication Rate: ${stats.twoFactorRate.toFixed(2)}%</li>
        </ul>
        <p>Generated at: ${new Date().toLocaleString()}</p>
      </div>
    `;
  }

  private generateDailyDigestText(stats: any, activeUsersCount: number): string {
    return `
Daily Platform Digest

Here's your daily summary:
- Total Users: ${stats.total}
- Active Users: ${stats.active}
- Active Today: ${activeUsersCount}
- Email Verification Rate: ${stats.verificationRate.toFixed(2)}%
- Two-Factor Authentication Rate: ${stats.twoFactorRate.toFixed(2)}%

Generated at: ${new Date().toLocaleString()}
    `;
  }

  private generateWeeklyReportHTML(stats: any, activeUsersCount: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Weekly Platform Report</h2>
        <p>Here's your weekly summary:</p>
        <ul>
          <li>Total Users: ${stats.total}</li>
          <li>Active Users: ${stats.active}</li>
          <li>Active This Week: ${activeUsersCount}</li>
          <li>Email Verification Rate: ${stats.verificationRate.toFixed(2)}%</li>
          <li>Two-Factor Authentication Rate: ${stats.twoFactorRate.toFixed(2)}%</li>
        </ul>
        <p>Generated at: ${new Date().toLocaleString()}</p>
      </div>
    `;
  }

  private generateWeeklyReportText(stats: any, activeUsersCount: number): string {
    return `
Weekly Platform Report

Here's your weekly summary:
- Total Users: ${stats.total}
- Active Users: ${stats.active}
- Active This Week: ${activeUsersCount}
- Email Verification Rate: ${stats.verificationRate.toFixed(2)}%
- Two-Factor Authentication Rate: ${stats.twoFactorRate.toFixed(2)}%

Generated at: ${new Date().toLocaleString()}
    `;
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
}

export const emailJob = new EmailJob();
