import { describe, expect, test } from "bun:test";
import { loadConfig } from "../config/env";
import { collectInvestigationEvidence } from "./investigation-adapters";

describe("collectInvestigationEvidence", () => {
  test("collects evidence with empty error set in mock mode", async () => {
    Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
    Bun.env.TELEPORT_CLUSTER = "main";
    Bun.env.TELEPORT_MOCK_IDENTITY = "true";

    const config = loadConfig();
    const evidence = await collectInvestigationEvidence(config, {
      incidentId: "inc-123",
      service: "api",
      correlationId: "corr-123",
    });

    expect(evidence.logs?.entries.length).toBeGreaterThan(0);
    expect(evidence.metrics?.points.length).toBeGreaterThan(0);
    expect(evidence.deploy?.commitSha).toBe("simulated-commit-sha");
    expect(evidence.errors.length).toBe(0);
  });
});
