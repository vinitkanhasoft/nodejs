import { logger } from '../config/logger';
import { mailService } from './mailService';
import { IEmailOptions } from '../types';
import { NotificationType } from '../enums/userEnums';

export interface INotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  channels?: NotificationType[];
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface INotificationTemplate {
  name: string;
  subject: string;
  title: string;
  message: string;
  variables?: string[];
}

export class NotificationService {
  private templates: Map<string, INotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  async sendNotification(notificationData: INotificationData): Promise<void> {
    try {
      const { userId, type, title, message, data, priority = 'medium', channels, scheduledAt, expiresAt } = notificationData;

      // Get user preferences
      const user = await this.getUserById(userId);
      if (!user) {
        logger.warn(`User not found for notification: ${userId}`);
        return;
      }

      // Determine which channels to use
      const notificationChannels = channels || this.determineChannels(type, user.preferences.notifications);

      // Schedule notification if needed
      if (scheduledAt && scheduledAt > new Date()) {
        await this.scheduleNotification(notificationData);
        return;
      }

      // Check if notification has expired
      if (expiresAt && expiresAt < new Date()) {
        logger.info(`Notification expired for user: ${userId}`);
        return;
      }

      // Send through each channel
      const promises = notificationChannels.map(channel => 
        this.sendThroughChannel(channel, {
          userId,
          title,
          message,
          data,
          user,
          priority,
        })
      );

      await Promise.allSettled(promises);

      // Log notification
      await this.logNotification(notificationData);

      logger.info(`Notification sent to user: ${userId} via channels: ${notificationChannels.join(', ')}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  async sendBulkNotifications(notifications: INotificationData[]): Promise<{ successful: number; failed: number }> {
    try {
      let successful = 0;
      let failed = 0;

      for (const notification of notifications) {
        try {
          await this.sendNotification(notification);
          successful++;
        } catch (error) {
          logger.error(`Failed to send notification to user ${notification.userId}:`, error);
          failed++;
        }
      }

      logger.info(`Bulk notifications sent: ${successful} successful, ${failed} failed`);
      return { successful, failed };
    } catch (error) {
      logger.error('Bulk notification sending failed:', error);
      throw error;
    }
  }

  async sendEmailNotification(userId: string, templateName: string, variables: Record<string, any>): Promise<void> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Notification template "${templateName}" not found`);
      }

      const user = await this.getUserById(userId);
      if (!user) {
        logger.warn(`User not found for email notification: ${userId}`);
        return;
      }

      const title = this.replaceVariables(template.title, { ...variables, userName: user.firstName });
      const message = this.replaceVariables(template.message, { ...variables, userName: user.firstName });

      await this.sendNotification({
        userId,
        type: NotificationType.EMAIL,
        title,
        message,
        data: variables,
        channels: [NotificationType.EMAIL],
      });

      logger.info(`Email notification sent to user: ${userId} using template: ${templateName}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  async sendPushNotification(userId: string, title: string, message: string, data?: Record<string, any>): Promise<void> {
    try {
      await this.sendNotification({
        userId,
        type: NotificationType.PUSH,
        title,
        message,
        data,
        channels: [NotificationType.PUSH],
      });

      logger.info(`Push notification sent to user: ${userId}`);
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  async sendSMSNotification(userId: string, message: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.phone) {
        logger.warn(`User or phone number not found for SMS notification: ${userId}`);
        return;
      }

      await this.sendNotification({
        userId,
        type: NotificationType.SMS,
        title: 'Notification',
        message,
        channels: [NotificationType.SMS],
      });

      logger.info(`SMS notification sent to user: ${userId}`);
    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      throw error;
    }
  }

  async sendInAppNotification(userId: string, title: string, message: string, data?: Record<string, any>): Promise<void> {
    try {
      await this.sendNotification({
        userId,
        type: NotificationType.IN_APP,
        title,
        message,
        data,
        channels: [NotificationType.IN_APP],
      });

      logger.info(`In-app notification sent to user: ${userId}`);
    } catch (error) {
      logger.error('Failed to send in-app notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, options: { page?: number; limit?: number; type?: NotificationType } = {}): Promise<any> {
    try {
      const { page = 1, limit = 20, type } = options;
      
      // This would typically query a notifications collection
      // For now, returning a placeholder
      return {
        userId,
        notifications: [],
        total: 0,
        page,
        limit,
        unreadCount: 0,
      };
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      // This would typically update the notification in the database
      logger.info(`Notification marked as read: ${notificationId} for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      // This would typically update all notifications for the user in the database
      logger.info(`All notifications marked as read for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
      // This would typically delete the notification from the database
      logger.info(`Notification deleted: ${notificationId} for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to delete notification:', error);
      throw error;
    }
  }

  async getUserNotificationPreferences(userId: string): Promise<any> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user.preferences.notifications;
    } catch (error) {
      logger.error('Failed to get user notification preferences:', error);
      throw error;
    }
  }

  async updateUserNotificationPreferences(userId: string, preferences: any): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.preferences.notifications = { ...user.preferences.notifications, ...preferences };
      await user.save();

      logger.info(`Notification preferences updated for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to update user notification preferences:', error);
      throw error;
    }
  }

  private async sendThroughChannel(channel: NotificationType, data: any): Promise<void> {
    switch (channel) {
      case NotificationType.EMAIL:
        await this.sendEmail(data);
        break;
      case NotificationType.SMS:
        await this.sendSMS(data);
        break;
      case NotificationType.PUSH:
        await this.sendPush(data);
        break;
      case NotificationType.IN_APP:
        await this.sendInApp(data);
        break;
      default:
        logger.warn(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendEmail(data: any): Promise<void> {
    const emailOptions: IEmailOptions = {
      to: data.user.email,
      subject: data.title,
      html: `<div><h2>${data.title}</h2><p>${data.message}</p></div>`,
      text: `${data.title}\n\n${data.message}`,
    };

    await mailService.sendEmail(emailOptions);
  }

  private async sendSMS(data: any): Promise<void> {
    // This would integrate with an SMS service like Twilio
    logger.info(`SMS would be sent to ${data.user.phone}: ${data.message}`);
  }

  private async sendPush(data: any): Promise<void> {
    // This would integrate with a push notification service like Firebase Cloud Messaging
    logger.info(`Push notification would be sent to user ${data.userId}: ${data.title}`);
  }

  private async sendInApp(data: any): Promise<void> {
    // This would store the notification in the database for in-app display
    logger.info(`In-app notification stored for user ${data.userId}: ${data.title}`);
  }

  private determineChannels(type: NotificationType, userPreferences: any): NotificationType[] {
    const channels: NotificationType[] = [];

    if (userPreferences.email && type !== NotificationType.IN_APP) {
      channels.push(NotificationType.EMAIL);
    }

    if (userPreferences.sms && type !== NotificationType.IN_APP) {
      channels.push(NotificationType.SMS);
    }

    if (userPreferences.push && type !== NotificationType.IN_APP) {
      channels.push(NotificationType.PUSH);
    }

    // Always add in-app notifications
    channels.push(NotificationType.IN_APP);

    return channels;
  }

  private async scheduleNotification(notificationData: INotificationData): Promise<void> {
    // This would integrate with a job scheduler like Bull or Agenda
    logger.info(`Notification scheduled for user: ${notificationData.userId} at: ${notificationData.scheduledAt}`);
  }

  private async logNotification(notificationData: INotificationData): Promise<void> {
    // This would log the notification to the database for analytics
    logger.info(`Notification logged: ${notificationData.type} for user: ${notificationData.userId}`);
  }

  private async getUserById(userId: string): Promise<any> {
    const { User } = require('../models/userModel');
    return User.findOne({ _id: userId });
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  private initializeTemplates(): void {
    const templates: INotificationTemplate[] = [
      {
        name: 'welcome',
        subject: 'Welcome to Our Platform!',
        title: 'Welcome!',
        message: 'Welcome to our platform! We\'re excited to have you on board.',
        variables: ['userName'],
      },
      {
        name: 'login_alert',
        subject: 'New Login Detected',
        title: 'New Login',
        message: 'A new login was detected on your account from {{location}} at {{time}}.',
        variables: ['userName', 'location', 'time'],
      },
      {
        name: 'password_change',
        subject: 'Password Changed Successfully',
        title: 'Password Changed',
        message: 'Your password has been changed successfully. If you didn\'t make this change, please contact support.',
        variables: ['userName'],
      },
      {
        name: 'account_suspended',
        subject: 'Account Suspended',
        title: 'Account Suspended',
        message: 'Your account has been suspended. Reason: {{reason}}',
        variables: ['userName', 'reason'],
      },
      {
        name: 'payment_received',
        subject: 'Payment Received',
        title: 'Payment Received',
        message: 'We have received your payment of ${{amount}} for {{description}}.',
        variables: ['userName', 'amount', 'description'],
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.name, template);
    });

    logger.info(`Initialized ${templates.length} notification templates`);
  }
}

export const notificationService = new NotificationService();
