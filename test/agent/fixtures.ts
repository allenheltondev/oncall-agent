/**
 * Test utilities and fixture builders.
 * Used by all tests to create consistent test data.
 */

import type { Incident, AgentState, AuditEvent } from "../../src/agent/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Load fixture JSON file.
 */
export function loadFixture<T>(fixtureName: string): T {
  const fixturePath = path.join(__dirname, "..", "..", "data", "scenarios", fixtureName);
  const contents = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(contents);
}

/**
 * Build a test incident.
 */
export function buildIncident(overrides?: Partial<Incident>): Incident {
  const defaults: Incident = {
    incident_id: "inc-test-001",
    title: "Test Incident",
    severity: "SEV2",
    service: "test-service",
    started_at: "2026-04-08T12:00:00Z",
    summary: "This is a test incident",
    initial_context: "No context",
  };
  return { ...defaults, ...overrides };
}

/**
 * Build a poisoned incident (for attack scenario tests).
 */
export function buildPoisonedIncident(payload: string, location: "summary" | "initial_context" = "summary"): Incident {
  return buildIncident({
    [location]: buildIncident()[location] + " " + payload,
  });
}

/**
 * Check if audit trail contains event of given type.
 */
export function hasAuditEvent(trail: AuditEvent[], eventType: string): boolean {
  return trail.some(e => e.eventType === eventType);
}

/**
 * Find all audit events of a given type.
 */
export function findAuditEvents(trail: AuditEvent[], eventType: string): AuditEvent[] {
  return trail.filter(e => e.eventType === eventType);
}

/**
 * Check if audit trail shows a tool was blocked.
 */
export function wasToolBlocked(trail: AuditEvent[], toolName: string): boolean {
  return trail.some(
    e => e.eventType === "TOOL_CALL_BLOCKED" && e.toolName === toolName
  );
}

/**
 * Check if audit trail shows an unsafe pattern was detected.
 */
export function wasUnsafePatternDetected(trail: AuditEvent[]): boolean {
  return trail.some(e => e.eventType === "UNSAFE_PATTERN_DETECTED");
}

/**
 * Matcher helpers for test frameworks.
 */
export const customMatchers = {
  toContainAuditEventType: (received: AuditEvent[], eventType: string) => {
    const pass = hasAuditEvent(received, eventType);
    return {
      pass,
      message: () =>
        pass
          ? `Audit trail contains ${eventType}`
          : `Audit trail does NOT contain ${eventType}\nReceived: ${JSON.stringify(received, null, 2)}`,
    };
  },
};

export {};