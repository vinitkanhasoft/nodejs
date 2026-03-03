import { logger } from '../config/logger';

export interface IMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

export interface ICounter {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface IGauge {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface IHistogram {
  name: string;
  buckets: Record<number, number>;
  count: number;
  sum: number;
  labels?: Record<string, string>;
}

export class MetricsCollector {
  private counters: Map<string, ICounter[]> = new Map();
  private gauges: Map<string, IGauge[]> = new Map();
  private histograms: Map<string, IHistogram[]> = new Map();
  private metrics: IMetric[] = [];

  /**
   * Increment a counter
   */
  static increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key) || [];
    
    const counter = existing.find(c => this.matchLabels(c.labels, labels)) || {
      name,
      value: 0,
      labels,
    };
    
    counter.value += value;
    
    if (!existing.includes(counter)) {
      existing.push(counter);
    }
    
    this.counters.set(key, existing);
    
    this.addMetric(name, counter.value, labels);
  }

  /**
   * Set a gauge value
   */
  static set(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.gauges.get(key) || [];
    
    const gauge = existing.find(g => this.matchLabels(g.labels, labels)) || {
      name,
      value: 0,
      labels,
    };
    
    gauge.value = value;
    
    if (!existing.includes(gauge)) {
      existing.push(gauge);
    }
    
    this.gauges.set(key, existing);
    
    this.addMetric(name, value, labels);
  }

  /**
   * Record a histogram value
   */
  static observe(name: string, value: number, buckets: number[] = [0.1, 0.5, 1, 2.5, 5, 10], labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key) || [];
    
    const histogram = existing.find(h => this.matchLabels(h.labels, labels)) || {
      name,
      buckets: buckets.reduce((acc, bucket) => ({ ...acc, [bucket]: 0 }), {}),
      count: 0,
      sum: 0,
      labels,
    };
    
    // Update bucket counts
    for (const bucket of buckets) {
      if (value <= bucket) {
        histogram.buckets[bucket]++;
      }
    }
    
    histogram.count++;
    histogram.sum += value;
    
    if (!existing.includes(histogram)) {
      existing.push(histogram);
    }
    
    this.histograms.set(key, existing);
    
    this.addMetric(name, value, labels);
  }

  /**
   * Get all counters
   */
  static getCounters(): ICounter[] {
    const result: ICounter[] = [];
    for (const counters of this.counters.values()) {
      result.push(...counters);
    }
    return result;
  }

  /**
   * Get all gauges
   */
  static getGauges(): IGauge[] {
    const result: IGauge[] = [];
    for (const gauges of this.gauges.values()) {
      result.push(...gauges);
    }
    return result;
  }

  /**
   * Get all histograms
   */
  static getHistograms(): IHistogram[] {
    const result: IHistogram[] = [];
    for (const histograms of this.histograms.values()) {
      result.push(...histograms);
    }
    return result;
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): IMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  static getMetricsByName(name: string): IMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Clear all metrics
   */
  static clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.metrics = [];
  }

  /**
   * Generate metrics in Prometheus format
   */
  static generatePrometheusMetrics(): string {
    let output = '';
    
    // Counters
    for (const counter of this.getCounters()) {
      const labelsStr = this.formatLabels(counter.labels);
      output += `# TYPE ${counter.name} counter\n`;
      output += `${counter.name}${labelsStr} ${counter.value}\n`;
    }
    
    // Gauges
    for (const gauge of this.getGauges()) {
      const labelsStr = this.formatLabels(gauge.labels);
      output += `# TYPE ${gauge.name} gauge\n`;
      output += `${gauge.name}${labelsStr} ${gauge.value}\n`;
    }
    
    // Histograms
    for (const histogram of this.getHistograms()) {
      const labelsStr = this.formatLabels(histogram.labels);
      output += `# TYPE ${histogram.name} histogram\n`;
      
      // Bucket counts
      for (const [bucket, count] of Object.entries(histogram.buckets)) {
        const bucketLabels = { ...histogram.labels, le: bucket };
        const bucketLabelsStr = this.formatLabels(bucketLabels);
        output += `${histogram.name}_bucket${bucketLabelsStr} ${count}\n`;
      }
      
      // Count and sum
      output += `${histogram.name}_count${labelsStr} ${histogram.count}\n`;
      output += `${histogram.name}_sum${labelsStr} ${histogram.sum}\n`;
    }
    
    return output;
  }

  /**
   * Get metrics summary
   */
  static getSummary(): {
    totalMetrics: number;
    counters: number;
    gauges: number;
    histograms: number;
    timestamp: Date;
  } {
    return {
      totalMetrics: this.metrics.length,
      counters: this.getCounters().length,
      gauges: this.getGauges().length,
      histograms: this.getHistograms().length,
      timestamp: new Date(),
    };
  }

  /**
   * Export metrics to JSON
   */
  static exportJSON(): {
    counters: ICounter[];
    gauges: IGauge[];
    histograms: IHistogram[];
    metrics: IMetric[];
    summary: ReturnType<typeof MetricsCollector.getSummary>;
  } {
    return {
      counters: this.getCounters(),
      gauges: this.getGauges(),
      histograms: this.getHistograms(),
      metrics: this.getAllMetrics(),
      summary: this.getSummary(),
    };
  }

  // Private helper methods
  private static getKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private static matchLabels(labels1?: Record<string, string>, labels2?: Record<string, string>): boolean {
    if (!labels1 && !labels2) return true;
    if (!labels1 || !labels2) return false;
    
    const keys1 = Object.keys(labels1).sort();
    const keys2 = Object.keys(labels2).sort();
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => labels1[key] === labels2[key]);
  }

  private static formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return '';
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `{${labelStr}}`;
  }

  private static addMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
    
    // Keep only last 10000 metrics to prevent memory leaks
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }
}

// Predefined metrics
export class SystemMetrics {
  static httpRequestsTotal = (method: string, route: string, statusCode: number) => {
    MetricsCollector.increment('http_requests_total', 1, {
      method,
      route,
      status_code: statusCode.toString(),
    });
  };

  static httpRequestDuration = (duration: number, method: string, route: string) => {
    MetricsCollector.observe('http_request_duration_seconds', duration / 1000, [0.1, 0.5, 1, 2.5, 5, 10], {
      method,
      route,
    });
  };

  static activeConnections = (count: number) => {
    MetricsCollector.set('active_connections', count);
  };

  static memoryUsage = (type: string, value: number) => {
    MetricsCollector.set('memory_usage_bytes', value, { type });
  };

  static cpuUsage = (type: string, value: number) => {
    MetricsCollector.set('cpu_usage_percent', value, { type });
  };

  static databaseConnections = (count: number) => {
    MetricsCollector.set('database_connections', count);
  };

  static cacheHits = (cache: string) => {
    MetricsCollector.increment('cache_hits_total', 1, { cache });
  };

  static cacheMisses = (cache: string) => {
    MetricsCollector.increment('cache_misses_total', 1, { cache });
  };

  static errorRate = (service: string, rate: number) => {
    MetricsCollector.set('error_rate', rate, { service });
  };

  static queueSize = (queue: string, size: number) => {
    MetricsCollector.set('queue_size', size, { queue });
  };

  static customCounter = (name: string, value: number = 1, labels?: Record<string, string>) => {
    MetricsCollector.increment(name, value, labels);
  };

  static customGauge = (name: string, value: number, labels?: Record<string, string>) => {
    MetricsCollector.set(name, value, labels);
  };

  static customHistogram = (name: string, value: number, buckets?: number[], labels?: Record<string, string>) => {
    MetricsCollector.observe(name, value, buckets, labels);
  };
}

// Metrics middleware for Express
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    
    SystemMetrics.httpRequestsTotal(req.method, route, res.statusCode);
    SystemMetrics.httpRequestDuration(duration, req.method, route);
  });
  
  next();
};
