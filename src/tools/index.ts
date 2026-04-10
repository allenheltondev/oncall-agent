/**
 * Tool registry: all approved tools and their implementations.
 * Used by the agent to execute tool calls safely.
 */

import type { ToolDefinition, ToolRegistry } from "../tools/types";
import { getIncidentContext } from "./get-incident-context";
import { queryLogs } from "./query-logs";
import { queryMetrics } from "./query-metrics";
import { postSlackSummary } from "./post-slack-summary";
import { openFollowupIssue } from "./open-followup-issue";

/**
 * Registry of all approved tools.
 * Each tool has a definition (schema) and implementation.
 */
export const toolRegistry: ToolRegistry = {
  get_incident_context: {
    name: "get_incident_context",
    description: "Load full incident metadata (context, timeline, events)",
    inputSchema: {
      type: "object",
      properties: {
        incidentId: {
          type: "string",
          description: "Unique incident identifier",
        },
      },
      required: ["incidentId"],
    },
    handler: getIncidentContext as any,
  },

  query_logs: {
    name: "query_logs",
    description: "Retrieve application logs for a service during a time window",
    inputSchema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name (e.g., 'checkout-api', 'auth-service')",
        },
        startTime: {
          type: "string",
          description: "ISO 8601 timestamp start",
        },
        endTime: {
          type: "string",
          description: "ISO 8601 timestamp end",
        },
        limit: {
          type: "number",
          description: "Max lines to return (default 100)",
        },
      },
      required: ["service", "startTime", "endTime"],
    },
    handler: queryLogs as any,
  },

  query_metrics: {
    name: "query_metrics",
    description: "Retrieve metrics/timeseries data for a service",
    inputSchema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service name",
        },
        metricNames: {
          type: "array",
          items: { type: "string" },
          description: "Metrics to fetch (cpu, memory, error_rate, p95_latency)",
        },
        startTime: {
          type: "string",
          description: "ISO 8601 timestamp start",
        },
        endTime: {
          type: "string",
          description: "ISO 8601 timestamp end",
        },
      },
      required: ["service", "metricNames", "startTime", "endTime"],
    },
    handler: queryMetrics as any,
  },

  post_slack_summary: {
    name: "post_slack_summary",
    description: "Send incident summary to the on-call channel",
    inputSchema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Target channel (must be #oncall-incidents)",
        },
        incidentId: {
          type: "string",
          description: "Incident ID",
        },
        summary: {
          type: "string",
          description: "Brief summary of what happened",
        },
        likelyCause: {
          type: "string",
          description: "Root cause hypothesis",
        },
        recommendedNextStep: {
          type: "string",
          description: "Suggested action",
        },
      },
      required: ["channel", "incidentId", "summary", "likelyCause", "recommendedNextStep"],
    },
    handler: postSlackSummary as any,
  },

  open_followup_issue: {
    name: "open_followup_issue",
    description: "Create a followup ticket for deeper investigation",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Issue title",
        },
        description: {
          type: "string",
          description: "Issue body",
        },
      },
      required: ["title", "description"],
    },
    handler: openFollowupIssue as any,
  },
};

/**
 * Get a tool by name.
 */
export function getTool(name: string): ToolDefinition | null {
  return toolRegistry[name as keyof typeof toolRegistry] || null;
}

/**
 * Get list of all tool names.
 */
export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}

/**
 * Get tool descriptions for LLM context.
 */
export function getToolDescriptions(): string {
  return Object.values(toolRegistry)
    .map(tool => `- ${tool.name}: ${tool.description}`)
    .join("\n");
}