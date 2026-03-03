import { mailConfig } from '../config/mail';
import { logger } from '../config/logger';
import { IEmailOptions, IEmailTemplate } from '../types';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants/messages';

export class MailService {
  async sendEmail(options: IEmailOptions): Promise<void> {
    try {
      await mailConfig.sendMail(options);
      logger.info(`Email sent successfully to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error(ERROR_MESSAGES.EMAIL_SEND_FAILED);
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    try {
      const template = await this.getEmailTemplate('welcome');
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Welcome email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendEmailVerificationEmail(userEmail: string, userName: string, verificationToken: string): Promise<void> {
    try {
      const template = await this.getEmailTemplate('verifyEmail');
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
        verificationUrl,
        verificationToken,
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Email verification sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send email verification:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<void> {
    try {
      const template = await this.getEmailTemplate('resetPassword');
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
        resetUrl,
        resetToken,
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Password reset email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendPasswordChangedEmail(userEmail: string, userName: string): Promise<void> {
    try {
      const template = await this.getEmailTemplate('passwordChanged');
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Password changed notification sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send password changed email:', error);
      throw error;
    }
  }

  async sendAccountSuspendedEmail(userEmail: string, userName: string, reason?: string): Promise<void> {
    try {
      const template = await this.getEmailTemplate('accountSuspended');
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
        reason: reason || 'Violation of our terms of service',
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Account suspension email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send account suspension email:', error);
      throw error;
    }
  }

  async sendAccountActivatedEmail(userEmail: string, userName: string): Promise<void> {
    try {
      const template = await this.getEmailTemplate('accountActivated');
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Account activation email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send account activation email:', error);
      throw error;
    }
  }

  async sendNotificationEmail(userEmail: string, userName: string, notificationData: any): Promise<void> {
    try {
      const template = await this.getEmailTemplate('notification');
      const html = this.replaceTemplateVariables(template.html, {
        userName,
        userEmail,
        ...notificationData,
      });

      await this.sendEmail({
        to: userEmail,
        subject: template.subject,
        html,
        text: template.text,
      });

      logger.info(`Notification email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send notification email:', error);
      throw error;
    }
  }

  async sendBulkEmails(emails: Array<{
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }>): Promise<{ successful: number; failed: number }> {
    try {
      const results = await mailConfig.sendBulkMail(emails);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Bulk email sent: ${successful} successful, ${failed} failed`);
      
      return { successful, failed };
    } catch (error) {
      logger.error('Failed to send bulk emails:', error);
      throw error;
    }
  }

  async verifyEmailConnection(): Promise<boolean> {
    try {
      return await mailConfig.verifyConnection();
    } catch (error) {
      logger.error('Email connection verification failed:', error);
      return false;
    }
  }

  private async getEmailTemplate(templateName: string): Promise<IEmailTemplate> {
    // This would typically load templates from a database or file system
    // For now, returning basic templates
    const templates: Record<string, IEmailTemplate> = {
      welcome: {
        name: 'welcome',
        subject: 'Welcome to Our Platform!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome, {{userName}}!</h2>
            <p>Thank you for joining our platform. We're excited to have you on board!</p>
            <p>Your account has been created with the email: {{userEmail}}</p>
            <p>Please verify your email address to get started.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Welcome, {{userName}}! Thank you for joining our platform. Your account has been created with the email: {{userEmail}}. Please verify your email address to get started.`,
      },
      verifyEmail: {
        name: 'verifyEmail',
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify Your Email Address</h2>
            <p>Hi {{userName}},</p>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
            <p>Or copy and paste this link in your browser: {{verificationUrl}}</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Hi {{userName}}, Please visit {{verificationUrl}} to verify your email address. This link will expire in 24 hours.`,
      },
      resetPassword: {
        name: 'resetPassword',
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Hi {{userName}},</p>
            <p>We received a request to reset your password. Click the link below to reset it:</p>
            <p><a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>Or copy and paste this link in your browser: {{resetUrl}}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Hi {{userName}}, We received a request to reset your password. Visit {{resetUrl}} to reset it. This link will expire in 1 hour. If you didn't request this, please ignore this email.`,
      },
      passwordChanged: {
        name: 'passwordChanged',
        subject: 'Your Password Has Been Changed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Changed Successfully</h2>
            <p>Hi {{userName}},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Hi {{userName}}, Your password has been successfully changed. If you didn't make this change, please contact our support team immediately.`,
      },
      accountSuspended: {
        name: 'accountSuspended',
        subject: 'Your Account Has Been Suspended',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Suspended</h2>
            <p>Hi {{userName}},</p>
            <p>Your account has been suspended due to: {{reason}}</p>
            <p>If you believe this is a mistake, please contact our support team.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Hi {{userName}}, Your account has been suspended due to: {{reason}}. If you believe this is a mistake, please contact our support team.`,
      },
      accountActivated: {
        name: 'accountActivated',
        subject: 'Your Account Has Been Activated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Activated</h2>
            <p>Hi {{userName}},</p>
            <p>Your account has been successfully activated!</p>
            <p>You can now log in and use all features of our platform.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Hi {{userName}}, Your account has been successfully activated! You can now log in and use all features of our platform.`,
      },
      notification: {
        name: 'notification',
        subject: 'New Notification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>{{title}}</h2>
            <p>Hi {{userName}},</p>
            <p>{{message}}</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `,
        text: `Hi {{userName}}, {{message}}`,
      },
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    return template;
  }

  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }
}

export const mailService = new MailService();
