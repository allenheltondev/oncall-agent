import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  assembleIncidentContext,
  INCIDENT_CONTEXT_SCHEMA_VERSION,
  persistIncidentContext,
} from "./incident-context";

describe("incident context", () => {
  test("assembles v1 context shape", () => {
    const context = assembleIncidentContext({
      incidentId: "inc-ctx-1",
      service: "api",
      correlationId: "corr-ctx-1",
      evidence: { errors: [] },
    });

    expect(context.schemaVersion).toBe(INCIDENT_CONTEXT_SCHEMA_VERSION);
    expect(context.incidentId).toBe("inc-ctx-1");
    expect(context.evidence.errors.length).toBe(0);
  });

  test("persists assembled context to data/context", async () => {
    const context = assembleIncidentContext({
      incidentId: "inc-ctx-2",
      service: "worker",
      evidence: { errors: [] },
    });

    const path = await persistIncidentContext(context);
    expect(existsSync(path)).toBe(true);
  });
});
