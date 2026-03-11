import { describe, expect, test } from "bun:test";
import { AgentRuntime } from "./runtime";

describe("AgentRuntime", () => {
  test("deduplicates incident IDs", () => {
    const runtime = new AgentRuntime();
    const incident = {
      schemaVersion: "incident.v1" as const,
      incidentId: "inc-123",
      source: "cloudwatch" as const,
      service: "api",
      severity: "high" as const,
      summary: "CPU high",
      detectedAt: "2026-03-11T12:00:00Z",
      correlationId: "corr-123",
    };

    expect(runtime.enqueue(incident)).toBe(true);
    expect(runtime.enqueue(incident)).toBe(false);
  });

  test("processes queued incident to DONE", async () => {
    const runtime = new AgentRuntime();
    runtime.enqueue({
      schemaVersion: "incident.v1",
      incidentId: "inc-456",
      source: "synthetic",
      service: "worker",
      severity: "critical",
      summary: "timeout",
      detectedAt: "2026-03-11T12:00:00Z",
      correlationId: "corr-456",
    });

    await runtime.drain();
    const record = runtime.getRecord("inc-456");
    expect(record?.state).toBe("DONE");
  });
});
