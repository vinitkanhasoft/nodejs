import cron from 'node-cron';
import { logger } from './logger';

interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void> | void;
  enabled?: boolean;
}

class CronManager {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  addJob(job: CronJob): void {
    if (job.enabled === false) {
      logger.info(`Cron job "${job.name}" is disabled`);
      return;
    }

    if (!cron.validate(job.schedule)) {
      logger.error(`Invalid cron schedule for job "${job.name}": ${job.schedule}`);
      return;
    }

    try {
      const scheduledTask = cron.schedule(job.schedule, async () => {
        logger.info(`Running cron job: ${job.name}`);
        try {
          await job.task();
          logger.info(`Cron job "${job.name}" completed successfully`);
        } catch (error) {
          logger.error(`Cron job "${job.name}" failed:`, error);
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.jobs.set(job.name, scheduledTask);
      logger.info(`Cron job "${job.name}" scheduled with pattern: ${job.schedule}`);
    } catch (error) {
      logger.error(`Failed to schedule cron job "${job.name}":`, error);
    }
  }

  startJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      logger.info(`Cron job "${name}" started`);
    } else {
      logger.warn(`Cron job "${name}" not found`);
    }
  }

  stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      logger.info(`Cron job "${name}" stopped`);
    } else {
      logger.warn(`Cron job "${name}" not found`);
    }
  }

  startAll(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Cron job "${name}" started`);
    });
  }

  stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Cron job "${name}" stopped`);
    });
  }

  removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      logger.info(`Cron job "${name}" removed`);
    } else {
      logger.warn(`Cron job "${name}" not found`);
    }
  }

  listJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  getJobStatus(name: string): 'running' | 'stopped' | 'not_found' {
    const job = this.jobs.get(name);
    if (!job) return 'not_found';
    
    // Note: node-cron doesn't have a built-in way to check if running
    // This is a simplified check - you might want to enhance this
    return 'running'; // This would need proper implementation
  }
}

export const cronManager = new CronManager();

export const predefinedJobs = {
  // Every minute
  everyMinute: '* * * * *',
  // Every 5 minutes
  everyFiveMinutes: '*/5 * * * *',
  // Every hour
  everyHour: '0 * * * *',
  // Every day at midnight
  daily: '0 0 * * *',
  // Every Sunday at midnight
  weekly: '0 0 * * 0',
  // First day of every month at midnight
  monthly: '0 0 1 * *',
  // Every weekday at 9 AM
  weekdaysAt9AM: '0 9 * * 1-5',
};
