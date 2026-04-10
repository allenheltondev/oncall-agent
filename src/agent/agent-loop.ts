/**
 * Agent Loop: Core investigation workflow.
 * Orchestrates the full incident investigation process using all components:
 * - Incident loading
 * - LLM conversation with tool calls
 * - Safety validation
 * - Audit logging
 * - Error handling
 */

import type { Incident, AgentState, ToolCall, ToolResult, ModelMessage } from "../agent/types";
import { SYSTEM_PROMPT } from "../agent/system-prompt";
import { checkToolCall } from "../agent/safety-checks";
import { AuditLogger } from "../audit/audit-logger";
import { toolRegistry } from "../tools";
import type { LlmOrchestrator } from "../llm/orchestrator";

/**
 * Main agent loop: investigates an incident end-to-end.
 */
export class AgentLoop {
  constructor(
    private readonly llm: LlmOrchestrator,
    private readonly maxIterations: number = 10
  ) {}

  /**
   * Run the complete investigation workflow.
   */
  async investigate(incident: Incident): Promise<AgentState> {
    const startedAt = new Date().toISOString();
    const auditLogger = new AuditLogger(incident.incident_id);
    auditLogger.agentStarted();

    // Initialize agent state
    const state: AgentState = {
      incidentId: incident.incident_id,
      status: "running",
      attempt: 1,
      messagesExchanged: [],
      toolCalls: [],
      auditTrail: [],
      finalSummary: null,
      toolCallsRequested: 0,
      toolCallsExecuted: 0,
      toolCallsBlocked: 0,
      blockedReasons: {},
      unsafePatternsDetected: 0,
      startedAt,
      completedAt: "", // Will be set when done
    };

    try {
      // Step 1: Load incident context
      const contextResult = await this.loadIncidentContext(incident, auditLogger);
      state.toolCallsExecuted = contextResult.success ? 1 : 0;
      if (!contextResult.success) {
        throw new Error(`Failed to load incident context: ${contextResult.error?.message}`);
      }

      // Step 2: Run investigation loop
      const investigationResult = await this.runInvestigationLoop(
        incident,
        contextResult.output,
        state,
        auditLogger
      );

      // Step 3: Complete the investigation
      state.status = investigationResult.status;
      state.finalSummary = investigationResult.summary;
      state.completedAt = new Date().toISOString();

      if (state.status === "completed") {
        auditLogger.agentCompleted(state.status, state.finalSummary || undefined);
      } else if (!auditLogger.getEvents().some((event) => event.eventType === "AGENT_FAILED")) {
        auditLogger.agentFailed("Investigation failed without final summary");
      }

      state.auditTrail = auditLogger.getEvents();
      return state;

    } catch (error) {
      state.status = "failed";
      state.completedAt = new Date().toISOString();

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      auditLogger.agentFailed(errorMessage);
      state.auditTrail = auditLogger.getEvents();

      return state;
    }
  }

  /**
   * Load full incident context using the get_incident_context tool.
   */
  private async loadIncidentContext(
    incident: Incident,
    auditLogger: AuditLogger
  ): Promise<ToolResult> {
    auditLogger.modelContextPrepared(5); // 5 approved tools

    const result = await this.executeTool("get_incident_context", {
      incidentId: incident.incident_id,
    });

    if (result.success) {
      auditLogger.toolResultReceived("get_incident_context", JSON.stringify(result.output).length);
    } else {
      auditLogger.toolCallFailed("get_incident_context", result.error?.message || "Unknown error");
    }

    return result;
  }

  /**
   * Main investigation loop: converse with LLM, execute tools, repeat.
   */
  private async runInvestigationLoop(
    incident: Incident,
    incidentContext: unknown,
    state: AgentState,
    auditLogger: AuditLogger
  ): Promise<{ status: "completed" | "failed"; summary: string | null }> {
    // Initial user message with incident
    const initialMessage: ModelMessage = {
      role: "user",
      content: this.formatInitialPrompt(incident, incidentContext),
      timestamp: new Date().toISOString(),
    };
    state.messagesExchanged.push(initialMessage);

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      auditLogger.modelCallRequested();

      // Get LLM response
      const llmResponse = await this.callLLM(state.messagesExchanged);
      if (!llmResponse.success) {
        auditLogger.toolCallFailed("llm_call", llmResponse.error || "Unknown LLM error");
        return { status: "failed", summary: null };
      }

      const assistantMessage: ModelMessage = {
        role: "assistant",
        content: llmResponse.content!,
        timestamp: new Date().toISOString(),
      };
      state.messagesExchanged.push(assistantMessage);

      auditLogger.modelResponseReceived(this.parseToolCalls(llmResponse.content!).length);

      // Parse and execute tool calls
      const toolCalls = this.parseToolCalls(llmResponse.content!);
      if (toolCalls.length > 0) {
        // Process each tool call
        for (const toolCall of toolCalls) {
          state.toolCalls.push(toolCall);
          state.toolCallsRequested++;

          auditLogger.toolCallRequested(toolCall.name, toolCall.arguments);

          // Safety check
          const safetyResult = this.checkToolCallSafety(toolCall);
          if (safetyResult.isDangerous) {
            const blockedReason = this.normalizeSafetyReason(safetyResult.reason);
            state.toolCallsBlocked++;
            state.unsafePatternsDetected++;
            state.blockedReasons[blockedReason] = (state.blockedReasons[blockedReason] || 0) + 1;

            toolCall.blocked = true;
            toolCall.blockedReason = blockedReason;
            toolCall.executedAt = new Date().toISOString();

            if (safetyResult.pattern && safetyResult.reason) {
              auditLogger.unsafePatternDetected(
                safetyResult.pattern,
                blockedReason,
                "tool_arguments",
                safetyResult.confidence,
                toolCall.name,
              );
            }
            auditLogger.toolCallBlocked(toolCall.name, safetyResult.reason!, safetyResult.pattern);
            continue;
          }

          const result = toolCall.name === "get_incident_context"
            ? {
                toolName: toolCall.name,
                callId: `call_${Date.now()}`,
                success: true,
                output: incidentContext,
              }
            : await this.executeTool(toolCall.name, toolCall.arguments);
          toolCall.executedAt = new Date().toISOString();

          if (result.success && toolCall.name !== "get_incident_context") {
            state.toolCallsExecuted++;
            auditLogger.toolCallExecuted(toolCall.name, JSON.stringify(result.output).length);
            auditLogger.toolResultReceived(toolCall.name, JSON.stringify(result.output).length);
          } else if (result.success) {
            auditLogger.toolResultReceived(toolCall.name, JSON.stringify(result.output).length);
          } else {
            auditLogger.toolCallFailed(toolCall.name, result.error?.message || "Unknown error");
          }

          // Add tool result to conversation
          const toolMessage: ModelMessage = {
            role: "user",
            content: `Tool result for ${toolCall.name}:\n${JSON.stringify(result, null, 2)}`,
            timestamp: new Date().toISOString(),
          };
          state.messagesExchanged.push(toolMessage);
        }
        // Continue to next iteration to get LLM response to tool results
        continue;
      }

      // No tool calls - check if this is a final summary
      const summary = this.extractFinalSummary(llmResponse.content!);
      if (summary) {
        auditLogger.agentCompleted("completed", summary);
        return { status: "completed", summary };
      }

      // No tool calls and no summary - this shouldn't happen in a well-behaved agent
      // Continue loop (though this might indicate an issue)
      continue;
    }

    // Max iterations reached without completion
    auditLogger.agentFailed("Maximum iterations reached without completion");
    return { status: "failed", summary: null };
  }

  /**
   * Format the initial prompt with incident and context.
   */
  private formatInitialPrompt(incident: Incident, context: unknown): string {
    return `INCIDENT REPORT:
ID: ${incident.incident_id}
Title: ${incident.title}
Severity: ${incident.severity}
Service: ${incident.service}
Started: ${incident.started_at}
Summary: ${incident.summary}

FULL CONTEXT:
${JSON.stringify(context, null, 2)}

Please investigate this incident using the available tools. When you have enough information, provide a final summary with root cause and recommended next steps.`;
  }

  /**
   * Call the LLM with current conversation.
   */
  private async callLLM(messages: ModelMessage[]): Promise<{ success: boolean; content?: string; usage?: unknown; error?: string }> {
    try {
      const prompt = `${SYSTEM_PROMPT}\n\n${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}`;
      const response = await this.llm.run("incident_analysis", prompt);
      const legacyContent = "content" in response ? response.content : undefined;
      const content = typeof response.text === "string"
        ? response.text
        : typeof legacyContent === "string"
          ? legacyContent
          : undefined;

      if (!content) {
        return {
          success: false,
          error: "LLM response missing text content",
        };
      }

      return {
        success: true,
        content,
        usage: response.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Parse tool calls from LLM response (simplified - assumes JSON format).
   */
  private parseToolCalls(content: string): ToolCall[] {
    // This is a simplified parser - in practice you'd use proper JSON parsing
    // and handle the specific format your LLM uses for tool calls
    const toolCalls: ToolCall[] = [];

    // Look for tool call patterns in the content
    const toolCallRegex = /TOOL_CALL:\s*(\w+)\s*(\{.*?\})/gs;
    let match;

    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        const [, toolName, argsStr] = match;
        if (!toolName || !argsStr) continue;

        let toolArgs: Record<string, unknown>;
        try {
          toolArgs = JSON.parse(argsStr);
        } catch {
          // Skip malformed JSON
          continue;
        }

        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: toolName,
          arguments: toolArgs,
          requestedAt: new Date().toISOString(),
        });
      } catch {
        // Skip malformed tool calls
        continue;
      }
    }

    return toolCalls;
  }

  /**
   * Check if a tool call is safe to execute.
   */
  private checkToolCallSafety(toolCall: ToolCall) {
    return checkToolCall(toolCall.name, toolCall.arguments);
  }

  private normalizeSafetyReason(reason?: string): string {
    if (!reason) {
      return "unknown";
    }

    return reason.replace(/^Dangerous pattern in tool (?:name|arguments):\s*/, "");
  }

  /**
   * Execute a tool by name with arguments.
   */
  private async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const toolDef = toolRegistry[name];
    if (!toolDef) {
      return {
        toolName: name,
        callId: `call_${Date.now()}`,
        success: false,
        error: {
          code: "TOOL_NOT_FOUND",
          message: `Tool '${name}' not found in registry`,
        },
      };
    }

      const result = await toolDef.handler(args);
      return {
        toolName: name,
        callId: `call_${Date.now()}`,
        success: result.success,
        output: result.output,
        error: result.error,
      };
  }

  /**
   * Extract final summary from LLM response (simplified).
   */
  private extractFinalSummary(content: string): string | null {
    // Look for summary indicators
    if (content.includes("FINAL SUMMARY") || content.includes("INVESTIGATION COMPLETE")) {
      return content;
    }
    return null;
  }
}
