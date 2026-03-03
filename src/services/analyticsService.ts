import { logger } from '../config/logger';
import { IAnalyticsEvent, IAnalyticsMetrics } from '../types';

export interface IPageViewEvent extends IAnalyticsEvent {
  event: 'page_view';
  properties: {
    page: string;
    title: string;
    referrer?: string;
    userAgent?: string;
    screenResolution?: string;
    viewportSize?: string;
  };
}

export interface IUserActionEvent extends IAnalyticsEvent {
  event: 'user_action';
  properties: {
    action: string;
    category: string;
    label?: string;
    value?: number;
  };
}

export interface IConversionEvent extends IAnalyticsEvent {
  event: 'conversion';
  properties: {
    conversionType: string;
    value?: number;
    currency?: string;
    productId?: string;
    productName?: string;
  };
}

export interface IErrorEvent extends IAnalyticsEvent {
  event: 'error';
  properties: {
    errorType: string;
    errorMessage: string;
    stack?: string;
    line?: number;
    column?: number;
    url?: string;
  };
}

export interface IPerformanceEvent extends IAnalyticsEvent {
  event: 'performance';
  properties: {
    metric: string;
    value: number;
    unit: string;
  };
}

export class AnalyticsService {
  async trackEvent(eventData: IAnalyticsEvent): Promise<void> {
    try {
      // Validate event data
      this.validateEvent(eventData);

      // Enrich event data
      const enrichedEvent = await this.enrichEvent(eventData);

      // Store event (could be in database, or sent to external service)
      await this.storeEvent(enrichedEvent);

      logger.info(`Analytics event tracked: ${eventData.event} for user: ${eventData.userId || 'anonymous'}`);
    } catch (error) {
      logger.error('Failed to track analytics event:', error);
      // Don't throw error to avoid affecting main application flow
    }
  }

  async trackPageView(data: Omit<IPageViewEvent, 'event' | 'timestamp'>): Promise<void> {
    const event: IPageViewEvent = {
      event: 'page_view',
      timestamp: new Date(),
      ...data,
    };

    await this.trackEvent(event);
  }

  async trackUserAction(data: Omit<IUserActionEvent, 'event' | 'timestamp'>): Promise<void> {
    const event: IUserActionEvent = {
      event: 'user_action',
      timestamp: new Date(),
      ...data,
    };

    await this.trackEvent(event);
  }

  async trackConversion(data: Omit<IConversionEvent, 'event' | 'timestamp'>): Promise<void> {
    const event: IConversionEvent = {
      event: 'conversion',
      timestamp: new Date(),
      ...data,
    };

    await this.trackEvent(event);
  }

  async trackError(data: Omit<IErrorEvent, 'event' | 'timestamp'>): Promise<void> {
    const event: IErrorEvent = {
      event: 'error',
      timestamp: new Date(),
      ...data,
    };

    await this.trackEvent(event);
  }

  async trackPerformance(data: Omit<IPerformanceEvent, 'event' | 'timestamp'>): Promise<void> {
    const event: IPerformanceEvent = {
      event: 'performance',
      timestamp: new Date(),
      ...data,
    };

    await this.trackEvent(event);
  }

  async getMetrics(dateRange: { from: Date; to: Date }): Promise<IAnalyticsMetrics> {
    try {
      const events = await this.getEventsByDateRange(dateRange);

      const metrics = this.calculateMetrics(events);

      logger.info(`Analytics metrics generated for range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
      return metrics;
    } catch (error) {
      logger.error('Failed to get analytics metrics:', error);
      throw error;
    }
  }

  async getUserMetrics(userId: string, dateRange?: { from: Date; to: Date }): Promise<any> {
    try {
      const events = await this.getEventsByUser(userId, dateRange);

      const userMetrics = {
        totalEvents: events.length,
        pageViews: events.filter(e => e.event === 'page_view').length,
        userActions: events.filter(e => e.event === 'user_action').length,
        conversions: events.filter(e => e.event === 'conversion').length,
        errors: events.filter(e => e.event === 'error').length,
        averageSessionDuration: this.calculateAverageSessionDuration(events),
        topPages: this.getTopPages(events),
        topActions: this.getTopActions(events),
        conversionRate: this.calculateConversionRate(events),
      };

      logger.info(`User metrics generated for user: ${userId}`);
      return userMetrics;
    } catch (error) {
      logger.error('Failed to get user metrics:', error);
      throw error;
    }
  }

  async getRealTimeMetrics(): Promise<any> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const recentEvents = await this.getEventsByDateRange({ from: fiveMinutesAgo, to: now });

      const realTimeMetrics = {
        activeUsers: this.getActiveUserCount(recentEvents),
        currentPageViews: recentEvents.filter(e => e.event === 'page_view').length,
        currentActions: recentEvents.filter(e => e.event === 'user_action').length,
        currentErrors: recentEvents.filter(e => e.event === 'error').length,
        topPages: this.getTopPages(recentEvents),
        averageResponseTime: this.getAverageResponseTime(recentEvents),
      };

      return realTimeMetrics;
    } catch (error) {
      logger.error('Failed to get real-time metrics:', error);
      throw error;
    }
  }

  async getConversionFunnels(funnelSteps: string[], dateRange?: { from: Date; to: Date }): Promise<any> {
    try {
      // This would analyze conversion funnels based on the defined steps
      // For now, returning a placeholder
      return {
        steps: funnelSteps,
        data: [],
        overallConversionRate: 0,
      };
    } catch (error) {
      logger.error('Failed to get conversion funnels:', error);
      throw error;
    }
  }

  async getRetentionMetrics(cohortDate: Date, days: number = 30): Promise<any> {
    try {
      // This would calculate user retention metrics for a cohort
      // For now, returning a placeholder
      return {
        cohortDate,
        days,
        retentionRates: [],
        averageRetention: 0,
      };
    } catch (error) {
      logger.error('Failed to get retention metrics:', error);
      throw error;
    }
  }

  async exportAnalytics(format: 'csv' | 'json' | 'excel', dateRange: { from: Date; to: Date }): Promise<Buffer> {
    try {
      const events = await this.getEventsByDateRange(dateRange);

      if (format === 'csv') {
        return this.exportToCSV(events);
      } else if (format === 'json') {
        return this.exportToJSON(events);
      } else if (format === 'excel') {
        return this.exportToExcel(events);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export analytics:', error);
      throw error;
    }
  }

  private validateEvent(event: IAnalyticsEvent): void {
    if (!event.event || typeof event.event !== 'string') {
      throw new Error('Event name is required and must be a string');
    }

    if (!event.properties || typeof event.properties !== 'object') {
      throw new Error('Event properties are required and must be an object');
    }

    if (event.timestamp && !(event.timestamp instanceof Date)) {
      throw new Error('Event timestamp must be a Date object');
    }
  }

  private async enrichEvent(event: IAnalyticsEvent): Promise<IAnalyticsEvent> {
    const enrichedEvent = { ...event };

    // Add timestamp if not provided
    if (!enrichedEvent.timestamp) {
      enrichedEvent.timestamp = new Date();
    }

    // Add user agent if not provided
    if (!enrichedEvent.userAgent && event.sessionId) {
      // This would typically get user agent from session data
    }

    // Add IP geolocation data if available
    if (event.ip) {
      // This would typically use a geolocation service
      enrichedEvent.properties = {
        ...enrichedEvent.properties,
        country: 'Unknown', // Would be determined by geolocation
        city: 'Unknown',
      };
    }

    return enrichedEvent;
  }

  private async storeEvent(event: IAnalyticsEvent): Promise<void> {
    // This would typically store the event in a database or send to external service
    // For now, just logging
    logger.debug(`Event stored: ${event.event}`, event);
  }

  private async getEventsByDateRange(dateRange: { from: Date; to: Date }): Promise<IAnalyticsEvent[]> {
    // This would typically query the database for events in the date range
    // For now, returning empty array
    return [];
  }

  private async getEventsByUser(userId: string, dateRange?: { from: Date; to: Date }): Promise<IAnalyticsEvent[]> {
    // This would typically query the database for events by user
    // For now, returning empty array
    return [];
  }

  private calculateMetrics(events: IAnalyticsEvent[]): IAnalyticsMetrics {
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean));

    const pageViews = events.filter(e => e.event === 'page_view');
    const uniquePages = new Set(pageViews.map(e => (e as any).properties?.page).filter(Boolean));

    return {
      totalUsers: uniqueUsers.size,
      activeUsers: uniqueUsers.size, // Would be calculated based on activity threshold
      newUsers: 0, // Would be calculated based on user creation dates
      totalSessions: uniqueSessions.size,
      averageSessionDuration: 0, // Would be calculated from session data
      bounceRate: 0, // Would be calculated from session data
      pageViews: pageViews.length,
      uniquePageViews: uniquePages.size,
    };
  }

  private calculateAverageSessionDuration(events: IAnalyticsEvent[]): number {
    // This would calculate average session duration from session data
    return 0;
  }

  private getTopPages(events: IAnalyticsEvent[]): Array<{ page: string; views: number }> {
    const pageViews = events.filter(e => e.event === 'page_view');
    const pageCounts: Record<string, number> = {};

    pageViews.forEach(event => {
      const page = (event as any).properties?.page;
      if (page) {
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      }
    });

    return Object.entries(pageCounts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getTopActions(events: IAnalyticsEvent[]): Array<{ action: string; count: number }> {
    const userActions = events.filter(e => e.event === 'user_action');
    const actionCounts: Record<string, number> = {};

    userActions.forEach(event => {
      const action = (event as any).properties?.action;
      if (action) {
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      }
    });

    return Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateConversionRate(events: IAnalyticsEvent[]): number {
    const totalSessions = new Set(events.map(e => e.sessionId).filter(Boolean)).size;
    const conversions = events.filter(e => e.event === 'conversion').length;

    return totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;
  }

  private getActiveUserCount(events: IAnalyticsEvent[]): number {
    return new Set(events.map(e => e.userId).filter(Boolean)).size;
  }

  private getAverageResponseTime(events: IAnalyticsEvent[]): number {
    const performanceEvents = events.filter(e => e.event === 'performance');
    if (performanceEvents.length === 0) return 0;

    const totalTime = performanceEvents.reduce((sum, event) => {
      return sum + ((event as any).properties?.value || 0);
    }, 0);

    return totalTime / performanceEvents.length;
  }

  private exportToCSV(events: IAnalyticsEvent[]): Buffer {
    const headers = ['timestamp', 'event', 'userId', 'sessionId', 'properties'];
    const csvData = events.map(event => [
      event.timestamp.toISOString(),
      event.event,
      event.userId || '',
      event.sessionId || '',
      JSON.stringify(event.properties),
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  private exportToJSON(events: IAnalyticsEvent[]): Buffer {
    return Buffer.from(JSON.stringify(events, null, 2), 'utf-8');
  }

  private exportToExcel(events: IAnalyticsEvent[]): Buffer {
    // This would use a library like xlsx to create Excel files
    // For now, returning CSV as fallback
    return this.exportToCSV(events);
  }
}

export const analyticsService = new AnalyticsService();
