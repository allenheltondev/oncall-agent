import { describe, expect, test } from "bun:test";
import { loadConfig } from "../config/env";
import { AgentRuntime } from "./runtime";

function prepareTestEnv(): void {
  Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
  Bun.env.TELEPORT_CLUSTER = "main";
  Bun.env.TELEPORT_MOCK_IDENTITY = "true";
  delete Bun.env.OPENAI_API_KEY;
  delete Bun.env.SLACK_WEBHOOK_URL;
}

describe("AgentRuntime", () => {
  test("deduplicates incident IDs", () => {
    prepareTestEnv();
    const runtime = new AgentRuntime(loadConfig());
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
    prepareTestEnv();
    const runtime = new AgentRuntime(loadConfig());
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
