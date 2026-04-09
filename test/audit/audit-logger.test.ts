/**
 * Tests for audit logging.
 */

import { AuditLogger } from "../../src/audit/audit-logger";

describe("AuditLogger", () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger("inc-test-001");
  });

  test("logs agent started", () => {
    logger.agentStarted();
    const events = logger.getEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        eventType: "AGENT_STARTED",
        incidentId: "inc-test-001",
      })
    );
  });

  test("logs tool call requested", () => {
    logger.toolCallRequested("query_logs", { service: "checkout-api" });
    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: "TOOL_CALL_REQUESTED",
      toolName: "query_logs",
    });
  });

  test("logs unsafe pattern detected", () => {
    logger.unsafePatternDetected(
      "/etc/passwd",
      "dangerous file path",
      "tool_arguments",
      0.95,
      "query_logs"
    );
    const patterns = logger.getUnsafePatterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      eventType: "UNSAFE_PATTERN_DETECTED",
      pattern: "/etc/passwd",
      confidence: 0.95,
    });
  });

  test("logs tool blocked", () => {
    logger.toolCallBlocked("query_logs", "dangerous file path", "/etc/passwd");
    const blocked = logger.getBlockedTools();
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toContain("dangerous");
  });

  test("tracks summary statistics", () => {
    logger.agentStarted();
    logger.toolCallRequested("query_logs", {});
    logger.toolCallExecuted("query_logs", 100);
    logger.toolCallRequested("post_slack_summary", {});
    logger.toolCallBlocked("unknown_tool", "not in registry");

    const summary = logger.getSummary();
    expect(summary.totalEvents).toBe(5);
    expect(summary.toolCallsRequested).toBe(2);
    expect(summary.toolCallsExecuted).toBe(1);
    expect(summary.toolCallsBlocked).toBe(1);
  });

  test("exports as JSONL", () => {
    logger.agentStarted();
    logger.toolCallRequested("query_logs", {});
    const jsonl = logger.toJsonl();
    const lines = jsonl.split("\n");
    expect(lines.length).toBe(2);
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });

  test("events are timestamp-ordered", () => {
    logger.agentStarted();
    // Small delay to ensure different timestamps
    logger.toolCallRequested("query_logs", {});
    const events = logger.getEvents();
    for (let i = 0; i < events.length - 1; i++) {
      expect(new Date(events[i].timestamp).getTime())
        .toBeLessThanOrEqual(new Date(events[i + 1].timestamp).getTime());
    }
  });
});