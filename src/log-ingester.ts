export interface LogEntry {
  timestamp: string;
  message: string;
  level: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface FetchOptions {
  logGroup: string;
  timeRange?: { start?: string; end?: string };
  filterPattern?: string;
  limit?: number;
}

export class LogIngester {
  private source: "cloudwatch" | "datadog";

  constructor(source: "cloudwatch" | "datadog") {
    this.source = source;
  }

  async fetch(options: FetchOptions): Promise<LogEntry[]> {
    switch (this.source) {
      case "cloudwatch":
        return this.fetchFromCloudWatch(options);
      case "datadog":
        return this.fetchFromDatadog(options);
    }
  }

  private async fetchFromCloudWatch(options: FetchOptions): Promise<LogEntry[]> {
    const endpoint = process.env.CLOUDWATCH_ENDPOINT ?? "https://logs.us-east-1.amazonaws.com";
    const startTime = options.timeRange?.start
      ? new Date(options.timeRange.start).getTime()
      : Date.now() - 3600000;
    const endTime = options.timeRange?.end
      ? new Date(options.timeRange.end).getTime()
      : Date.now();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "Logs_20140328.FilterLogEvents",
      },
      body: JSON.stringify({
        logGroupName: options.logGroup,
        startTime,
        endTime,
        filterPattern: options.filterPattern ?? "",
        limit: options.limit ?? 1000,
      }),
    });

    const data = (await response.json()) as { events?: Array<{ timestamp: number; message: string }> };

    return (data.events ?? []).map((event) => ({
      timestamp: new Date(event.timestamp).toISOString(),
      message: event.message,
      level: this.inferLevel(event.message),
      source: options.logGroup,
    }));
  }

  private async fetchFromDatadog(options: FetchOptions): Promise<LogEntry[]> {
    const apiKey = process.env.DATADOG_API_KEY ?? "";
    const appKey = process.env.DATADOG_APP_KEY ?? "";

    const response = await fetch("https://api.datadoghq.com/api/v2/logs/events/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": apiKey,
        "DD-APPLICATION-KEY": appKey,
      },
      body: JSON.stringify({
        filter: {
          query: `service:${options.logGroup} ${options.filterPattern ?? ""}`,
          from: options.timeRange?.start ?? "now-1h",
          to: options.timeRange?.end ?? "now",
        },
        page: { limit: options.limit ?? 1000 },
      }),
    });

    const data = (await response.json()) as {
      data?: Array<{ attributes: { timestamp: string; message: string; status: string } }>;
    };

    return (data.data ?? []).map((log) => ({
      timestamp: log.attributes.timestamp,
      message: log.attributes.message,
      level: log.attributes.status?.toUpperCase() ?? "INFO",
      source: options.logGroup,
    }));
  }

  private inferLevel(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes("error") || lower.includes("exception")) return "ERROR";
    if (lower.includes("warn")) return "WARN";
    if (lower.includes("debug")) return "DEBUG";
    return "INFO";
  }
}
