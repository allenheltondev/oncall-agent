/**
 * Audit event types and schema.
 * All actions by the agent are represented as audit events.
 */

export type AuditEventType =
  | "AGENT_STARTED"
  | "MODEL_CONTEXT_PREPARED"
  | "MODEL_CALL_REQUESTED"
  | "MODEL_RESPONSE_RECEIVED"
  | "TOOL_CALL_INVALID"
  | "TOOL_CALL_REQUESTED"
  | "SAFETY_CHECK_STARTED"
  | "SAFETY_CHECK_PASSED"
  | "SAFETY_CHECK_FAILED"
  | "UNSAFE_PATTERN_DETECTED"
  | "TOOL_CALL_BLOCKED"
  | "TOOL_CALL_EXECUTED"
  | "TOOL_CALL_FAILED"
  | "TOOL_RESULT_RECEIVED"
  | "SUMMARY_VALIDATION_STARTED"
  | "SUMMARY_VALIDATION_PASSED"
  | "SUMMARY_VALIDATION_FAILED"
  | "SUMMARY_UNSAFE_CONTENT_DETECTED"
  | "POST_SLACK_REQUESTED"
  | "POST_SLACK_COMPLETED"
  | "AGENT_COMPLETED"
  | "AGENT_FAILED";

/**
 * Single audit event.
 * Immutable once created. All events are timestamped and ordered.
 */
export interface AuditEvent {
  timestamp: string;             // ISO 8601, server time
  eventType: AuditEventType;
  incidentId: string;

  // Context: what was this event about?
  toolName?: string;             // if tool-related
  action?: string;               // human-readable action

  // Why did this event occur?
  reason?: string;               // explanation (e.g., "dangerous file path")
  source?: "model_output" | "tool_arguments" | "tool_result" | "summary";

  // If a pattern was detected
  pattern?: string;              // the detected pattern or payload
  confidence?: number;           // 0.0 (uncertain) to 1.0 (certain)
  severity?: "info" | "warning" | "error";

  // Contextual data
  metadata?: Record<string, unknown>;
}

/**
 * For easier event creation.
 */
export function createAuditEvent(
  eventType: AuditEventType,
  incidentId: string,
  options?: {
    toolName?: string;
    action?: string;
    reason?: string;
    pattern?: string;
    source?: "model_output" | "tool_arguments" | "tool_result" | "summary";
    confidence?: number;
    severity?: "info" | "warning" | "error";
    metadata?: Record<string, unknown>;
  }
): AuditEvent {
  return {
    timestamp: new Date().toISOString(),
    eventType,
    incidentId,
    toolName: options?.toolName,
    action: options?.action,
    reason: options?.reason,
    pattern: options?.pattern,
    source: options?.source,
    confidence: options?.confidence,
    severity: options?.severity,
    metadata: options?.metadata,
  };
}

export {};