import { describe, expect, test } from "bun:test";
import { parseIncidentSignal } from "./incident";

describe("parseIncidentSignal", () => {
  test("accepts valid incident.v1 payload", () => {
    const parsed = parseIncidentSignal({
      schemaVersion: "incident.v1",
      incidentId: "inc-1",
      source: "cloudwatch",
      service: "api",
      severity: "high",
      summary: "CPU spike",
      detectedAt: "2026-03-11T12:00:00Z",
    });

    expect(parsed.schemaVersion).toBe("incident.v1");
    expect(parsed.severity).toBe("high");
  });

  test("rejects unknown severity", () => {
    expect(() =>
      parseIncidentSignal({
        schemaVersion: "incident.v1",
        incidentId: "inc-1",
        source: "cloudwatch",
        service: "api",
        severity: "urgent",
        summary: "CPU spike",
        detectedAt: "2026-03-11T12:00:00Z",
      }),
    ).toThrow("Unsupported incident severity");
  });
});
