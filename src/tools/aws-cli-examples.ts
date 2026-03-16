import type { AppConfig } from "../config/env";
import { executeAwsCli } from "./aws-cli";

/**
 * Example: Fetch CloudWatch logs for a service
 */
export async function fetchCloudWatchLogs(
  config: AppConfig,
  serviceName: string,
  incidentId: string,
) {
  const result = await executeAwsCli(config, {
    service: "logs",
    command: "filter-log-events",
    args: [
      "--log-group-name", `/aws/service/${serviceName}`,
      "--start-time", `${Date.now() - 3600000}`,
      "--filter-pattern", "ERROR",
    ],
    reason: `investigation:${incidentId}`,
  });

  if (result.success) {
    const events = JSON.parse(result.stdout).events ?? [];
    return events.map((e: any) => ({
      timestamp: new Date(e.timestamp).toISOString(),
      message: e.message,
    }));
  }

  throw new Error(`Failed to fetch logs: ${result.stderr}`);
}

/**
 * Example: Get CloudWatch metric statistics
 */
export async function getMetricStatistics(
  config: AppConfig,
  namespace: string,
  metricName: string,
  incidentId: string,
) {
  const result = await executeAwsCli(config, {
    service: "cloudwatch",
    command: "get-metric-statistics",
    args: [
      "--namespace", namespace,
      "--metric-name", metricName,
      "--start-time", new Date(Date.now() - 3600000).toISOString(),
      "--end-time", new Date().toISOString(),
      "--period", "300",
      "--statistics", "Average",
    ],
    reason: `investigation:${incidentId}`,
  });

  if (result.success) {
    return JSON.parse(result.stdout);
  }

  throw new Error(`Failed to fetch metrics: ${result.stderr}`);
}

/**
 * Example: Describe EC2 instances
 */
export async function describeInstances(
  config: AppConfig,
  filters: string[],
  incidentId: string,
) {
  const result = await executeAwsCli(config, {
    service: "ec2",
    command: "describe-instances",
    args: filters.length > 0 ? ["--filters", ...filters] : [],
    reason: `investigation:${incidentId}`,
  });

  if (result.success) {
    return JSON.parse(result.stdout);
  }

  throw new Error(`Failed to describe instances: ${result.stderr}`);
}

/**
 * Example: Get Lambda function configuration
 */
export async function getLambdaFunction(
  config: AppConfig,
  functionName: string,
  incidentId: string,
) {
  const result = await executeAwsCli(config, {
    service: "lambda",
    command: "get-function",
    args: ["--function-name", functionName],
    reason: `investigation:${incidentId}`,
  });

  if (result.success) {
    return JSON.parse(result.stdout);
  }

  throw new Error(`Failed to get Lambda function: ${result.stderr}`);
}
