import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const mailConfig = {
  verifyConnection: async (): Promise<boolean> => {
    try {
      await transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  },

  sendMail: async (options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: any[];
  }): Promise<any> => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`);
      return result;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  },

  sendBulkMail: async (emails: Array<{
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }>): Promise<any[]> => {
    try {
      const results = await Promise.allSettled(
        emails.map(email => mailConfig.sendMail(email))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Bulk email sent: ${successful} successful, ${failed} failed`);
      return results;
    } catch (error) {
      logger.error('Error sending bulk email:', error);
      throw error;
    }
  },
};

export { transporter };
