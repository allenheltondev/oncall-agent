/**
 * Common interface that both local and Beams drivers implement.
 * Isolates agent loop from runtime-specific details.
 */

import type { Incident, ModelMessage, ToolCall, ToolResult, AuditEvent } from "../agent/types";
import type { ToolDefinition } from "../tools/types";

/**
 * Driver: abstraction for runtime execution.
 * Implementations: LocalDriver (uses Node.js + LLM API), BeamsDriver (uses Beams SDK).
 */
export interface DriverInterface {
  /**
   * Load incident from source.
   * Local: from JSON file
   * Beams: from Beams incident store (if available)
   */
  getIncident(incidentId: string): Promise<Incident>;

  /**
   * Call LLM/model to generate response.
   * Sends: system prompt + prior messages + tool definitions
   * Returns: model response (text + tool calls)
   */
  callModel(options: {
    incident: Incident;
    systemPrompt: string;
    priorMessages: ModelMessage[];
    tools: ToolDefinition[];
  }): Promise<{
    content: string;
    toolCalls?: ToolCall[];
  }>;

  /**
   * Execute a single tool call.
   * May be executed locally or delegated to Beams.
   * Driver handles isolation/sandboxing.
   */
  executeTool(toolCall: ToolCall): Promise<ToolResult>;

  /**
   * Retrieve audit trail collected during execution.
   * Local: from in-memory audit logger
   * Beams: from Beams runtime + local log merger
   */
  getAuditTrail(): Promise<AuditEvent[]>;
}

export {};