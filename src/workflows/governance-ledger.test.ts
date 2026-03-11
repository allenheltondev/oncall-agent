import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { appendGovernanceEntry, writeGovernanceSnapshot } from "./governance-ledger";

describe("governance ledger", () => {
  test("appends jsonl audit entry", async () => {
    const path = await appendGovernanceEntry({
      timestamp: new Date().toISOString(),
      incidentId: "inc-gov-1",
      correlationId: "corr-gov-1",
      action: "identity.request.aws",
      identityScope: "cloudwatch:read",
      authDecision: "allow",
      outcome: "success",
    });

    expect(existsSync(path)).toBe(true);
  });

  test("writes governance snapshot", async () => {
    const path = await writeGovernanceSnapshot([
      {
        timestamp: new Date().toISOString(),
        incidentId: "inc-gov-2",
        action: "remediation.proposal",
        identityScope: "pr:create",
        authDecision: "allow",
        outcome: "success",
      },
    ]);

    expect(existsSync(path)).toBe(true);
  });
});
