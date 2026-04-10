/**
 * Stub tool: query_metrics
 * Retrieves metrics/timeseries data for a service.
 */

export interface QueryMetricsInput {
  service: string;
  metricNames: string[];
  startTime: string;
  endTime: string;
}

export type MetricsOutput = Record<string, Array<{ timestamp: string; value: number }>>;

export async function queryMetrics(
  input: QueryMetricsInput
): Promise<{ success: boolean; output?: MetricsOutput; error?: { code: string; message: string } }> {
  // Validate required fields
  if (!input.service || typeof input.service !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "service is required and must be a string",
      },
    };
  }

  if (!Array.isArray(input.metricNames) || input.metricNames.length === 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "metricNames is required and must be a non-empty array",
      },
    };
  }

  if (!input.startTime || typeof input.startTime !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "startTime is required and must be a string",
      },
    };
  }

  if (!input.endTime || typeof input.endTime !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "endTime is required and must be a string",
      },
    };
  }

  // Validate time format
  try {
    const startDate = new Date(input.startTime);
    const endDate = new Date(input.endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid timestamp");
    }
  } catch {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "startTime and endTime must be valid ISO 8601 timestamps",
      },
    };
  }

  // Generate mock metrics
  const metrics: MetricsOutput = {};

  for (const metricName of input.metricNames) {
    switch (metricName.toLowerCase()) {
      case "cpu":
        metrics[metricName] = [
          { timestamp: "2026-04-08T12:00:00Z", value: 45 },
          { timestamp: "2026-04-08T12:05:00Z", value: 62 },
          { timestamp: "2026-04-08T12:10:00Z", value: 85 },
          { timestamp: "2026-04-08T12:15:00Z", value: 92 },
        ];
        break;
      case "memory":
        metrics[metricName] = [
          { timestamp: "2026-04-08T12:00:00Z", value: 2048 },
          { timestamp: "2026-04-08T12:05:00Z", value: 3500 },
          { timestamp: "2026-04-08T12:10:00Z", value: 4200 },
          { timestamp: "2026-04-08T12:15:00Z", value: 4700 },
        ];
        break;
      case "error_rate":
        metrics[metricName] = [
          { timestamp: "2026-04-08T12:00:00Z", value: 0.5 },
          { timestamp: "2026-04-08T12:05:00Z", value: 1.2 },
          { timestamp: "2026-04-08T12:10:00Z", value: 5.8 },
          { timestamp: "2026-04-08T12:15:00Z", value: 8.3 },
        ];
        break;
      case "p95_latency":
        metrics[metricName] = [
          { timestamp: "2026-04-08T12:00:00Z", value: 120 },
          { timestamp: "2026-04-08T12:05:00Z", value: 350 },
          { timestamp: "2026-04-08T12:10:00Z", value: 2500 },
          { timestamp: "2026-04-08T12:15:00Z", value: 5000 },
        ];
        break;
      default:
        // Return empty datapoints for unknown metrics
        metrics[metricName] = [];
    }
  }

  return {
    success: true,
    output: metrics,
  };
}
