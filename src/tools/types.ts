/**
 * Tool contract and registry types.
 * Defines how tools are specified and called.
 */

import type { ToolResult } from "../agent/types";

/**
 * Specification for a single tool.
 * Tools are invoked by name with arguments validated against inputSchema.
 */
export interface ToolDefinition {
  // Tool identity
  name: string;
  description: string;           // what the tool does

  // Input validation (JSON Schema-like)
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };

  // Execution
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

/**
 * Tool registry: maps tool names to definitions.
 * Used during agent loop to:
 * 1. Validate that requested tool exists
 * 2. Validate arguments against schema
 * 3. Execute tool
 */
export type ToolRegistry = Record<string, ToolDefinition>;

/**
 * Tool call error (validation or execution failure).
 */
export class ToolCallError extends Error {
  constructor(
    public toolName: string,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ToolCallError";
  }
}

export {};