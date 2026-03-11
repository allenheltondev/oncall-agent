import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { runE2EScenarioFromPayload } from "./e2e-scenarios";

describe("runE2EScenarioFromPayload", () => {
  test("executes alarm -> investigation -> remediation proposal path", async () => {
    Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
    Bun.env.TELEPORT_CLUSTER = "main";
    Bun.env.TELEPORT_MOCK_IDENTITY = "true";

    const result = await runE2EScenarioFromPayload({
      schemaVersion: "incident.v1",
      incidentId: "inc-e2e-1",
      source: "synthetic",
      service: "api",
      severity: "high",
      summary: "Synthetic incident",
      detectedAt: new Date().toISOString(),
      correlationId: "corr-e2e-1",
    });

    expect(result.incidentId).toBe("inc-e2e-1");
    expect(existsSync(result.contextPath)).toBe(true);
    expect(result.proposalBranch).toContain("agent/remediate/");
    expect(result.governanceLogged).toBe(true);
  });
});
