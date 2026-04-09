/**
 * Audit logger: captures all events during agent execution.
 * Used to create a replay trail of what happened, what was attempted, what was blocked.
 */

import type { AuditEvent, AuditEventType } from "./audit-model";
import { createAuditEvent } from "./audit-model";

export class AuditLogger {
  private events: AuditEvent[] = [];
  private incidentId: string;

  constructor(incidentId: string) {
    this.incidentId = incidentId;
  }

  /**
   * Log an event.
   */
  private log(event: AuditEvent): void {
    this.events.push(event);
  }

  // ─────── Agent Lifecycle ──────

  public agentStarted(): void {
    this.log(
      createAuditEvent("AGENT_STARTED", this.incidentId, {
        action: "Agent investigation started",
      })
    );
  }

  public agentCompleted(status: "completed" | "failed" | "blocked", summary?: string): void {
    this.log(
      createAuditEvent("AGENT_COMPLETED", this.incidentId, {
        action: `Agent investigation ${status}`,
        metadata: summary ? { summary } : undefined,
      })
    );
  }

  public agentFailed(reason: string): void {
    this.log(
      createAuditEvent("AGENT_FAILED", this.incidentId, {
        reason,
        severity: "error",
      })
    );
  }

  // ─────── Model Calls ──────

  public modelContextPrepared(toolCount: number): void {
    this.log(
      createAuditEvent("MODEL_CONTEXT_PREPARED", this.incidentId, {
        action: "Model context prepared",
        metadata: { toolCount },
      })
    );
  }

  public modelCallRequested(): void {
    this.log(
      createAuditEvent("MODEL_CALL_REQUESTED", this.incidentId, {
        action: "Model API call initiated",
      })
    );
  }

  public modelResponseReceived(toolCallsFound: number): void {
    this.log(
      createAuditEvent("MODEL_RESPONSE_RECEIVED", this.incidentId, {
        action: "Model response received",
        metadata: { toolCallsFound },
      })
    );
  }

  // ─────── Tool Validation ──────

  public toolCallInvalid(toolName: string, reason: string): void {
    this.log(
      createAuditEvent("TOOL_CALL_INVALID", this.incidentId, {
        toolName,
        action: `Invalid tool call: ${toolName}`,
        reason,
        severity: "warning",
      })
    );
  }

  public toolCallRequested(toolName: string, args: Record<string, unknown>): void {
    this.log(
      createAuditEvent("TOOL_CALL_REQUESTED", this.incidentId, {
        toolName,
        action: `Tool call requested: ${toolName}`,
        metadata: { argsKeys: Object.keys(args) },
      })
    );
  }

  // ─────── Safety Checks ──────

  public safetyCheckStarted(toolName: string): void {
    this.log(
      createAuditEvent("SAFETY_CHECK_STARTED", this.incidentId, {
        toolName,
        action: `Safety check started for ${toolName}`,
      })
    );
  }

  public safetyCheckPassed(toolName: string, confidence: number): void {
    this.log(
      createAuditEvent("SAFETY_CHECK_PASSED", this.incidentId, {
        toolName,
        action: `Safety check passed for ${toolName}`,
        confidence,
      })
    );
  }

  public unsafePatternDetected(
    pattern: string,
    reason: string,
    source: "model_output" | "tool_arguments" | "tool_result" | "summary",
    confidence: number,
    toolName?: string
  ): void {
    this.log(
      createAuditEvent("UNSAFE_PATTERN_DETECTED", this.incidentId, {
        toolName,
        pattern,
        reason,
        source,
        confidence,
        severity: confidence > 0.85 ? "error" : "warning",
      })
    );
  }

  public toolCallBlocked(toolName: string, reason: string, pattern?: string): void {
    this.log(
      createAuditEvent("TOOL_CALL_BLOCKED", this.incidentId, {
        toolName,
        action: `Tool call blocked: ${toolName}`,
        reason,
        pattern,
        severity: "warning",
      })
    );
  }

  // ─────── Tool Execution ──────

  public toolCallExecuted(toolName: string, resultSize?: number): void {
    this.log(
      createAuditEvent("TOOL_CALL_EXECUTED", this.incidentId, {
        toolName,
        action: `Tool executed: ${toolName}`,
        metadata: resultSize ? { resultSize } : undefined,
      })
    );
  }

  public toolCallFailed(toolName: string, error: string): void {
    this.log(
      createAuditEvent("TOOL_CALL_FAILED", this.incidentId, {
        toolName,
        reason: error,
        severity: "error",
      })
    );
  }

  public toolResultReceived(toolName: string, resultSize: number): void {
    this.log(
      createAuditEvent("TOOL_RESULT_RECEIVED", this.incidentId, {
        toolName,
        action: `Tool result received: ${toolName}`,
        metadata: { resultSize },
      })
    );
  }

  // ─────── Summary Validation ──────

  public summaryValidationStarted(): void {
    this.log(
      createAuditEvent("SUMMARY_VALIDATION_STARTED", this.incidentId, {
        action: "Summary validation started",
      })
    );
  }

  public summaryValidationPassed(): void {
    this.log(
      createAuditEvent("SUMMARY_VALIDATION_PASSED", this.incidentId, {
        action: "Summary validation passed",
      })
    );
  }

  public summaryUnsafeContent(reason: string, pattern?: string): void {
    this.log(
      createAuditEvent("SUMMARY_UNSAFE_CONTENT_DETECTED", this.incidentId, {
        reason,
        pattern,
        severity: "error",
      })
    );
  }

  // ─────── Slack Posting ──────

  public postSlackRequested(channel: string): void {
    this.log(
      createAuditEvent("POST_SLACK_REQUESTED", this.incidentId, {
        action: `Posting to ${channel}`,
        metadata: { channel },
      })
    );
  }

  public postSlackCompleted(ts: string): void {
    this.log(
      createAuditEvent("POST_SLACK_COMPLETED", this.incidentId, {
        action: "Summary posted to Slack",
        metadata: { ts },
      })
    );
  }

  // ─────── Export / Query ──────

  /**
   * Get all audit events in order.
   */
  public getEvents(): AuditEvent[] {
    return [...this.events];
  }

  /**
   * Get count of events by type.
   */
  public getEventCounts(): Record<AuditEventType, number> {
    const counts: Record<string, number> = {};
    for (const event of this.events) {
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    }
    return counts as Record<AuditEventType, number>;
  }

  /**
   * Get all unsafe patterns detected.
   */
  public getUnsafePatterns(): AuditEvent[] {
    return this.events.filter(e => e.eventType === "UNSAFE_PATTERN_DETECTED");
  }

  /**
   * Get all blocked tool calls.
   */
  public getBlockedTools(): AuditEvent[] {
    return this.events.filter(e => e.eventType === "TOOL_CALL_BLOCKED");
  }

  /**
   * Export as JSONL (one event per line).
   */
  public toJsonl(): string {
    return this.events.map(e => JSON.stringify(e)).join("\n");
  }

  /**
   * Export summary statistics.
   */
  public getSummary(): {
    totalEvents: number;
    toolCallsRequested: number;
    toolCallsExecuted: number;
    toolCallsBlocked: number;
    unsafePatternsDetected: number;
  } {
    const counts = this.getEventCounts();
    return {
      totalEvents: this.events.length,
      toolCallsRequested: counts.TOOL_CALL_REQUESTED ?? 0,
      toolCallsExecuted: counts.TOOL_CALL_EXECUTED ?? 0,
      toolCallsBlocked: counts.TOOL_CALL_BLOCKED ?? 0,
      unsafePatternsDetected: counts.UNSAFE_PATTERN_DETECTED ?? 0,
    };
  }
}