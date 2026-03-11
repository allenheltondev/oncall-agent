import { describe, expect, test } from "bun:test";
import { assembleIncidentContext } from "./incident-context";
import {
  evaluateRemediationGuardrails,
  resetGuardrailCounters,
  type GuardrailConfig,
} from "./safety-guardrails";

describe("evaluateRemediationGuardrails", () => {
  test("allows high-confidence remediation under budget", () => {
    resetGuardrailCounters();
    const context = assembleIncidentContext({
      incidentId: "inc-safe-1",
      service: "api",
      evidence: { errors: [] },
    });

    const decision = evaluateRemediationGuardrails(
      context,
      [{ id: "h1", summary: "ok", confidence: 0.9, evidence: [] }],
      "safe fallback patch",
    );

    expect(decision.allowed).toBe(true);
  });

  test("blocks when kill switch is enabled", () => {
    resetGuardrailCounters();
    const context = assembleIncidentContext({
      incidentId: "inc-safe-2",
      service: "api",
      evidence: { errors: [] },
    });

    const cfg: GuardrailConfig = {
      maxRemediationsPerRun: 1,
      denyPatchKeywords: [],
      killSwitch: true,
    };

    const decision = evaluateRemediationGuardrails(
      context,
      [{ id: "h1", summary: "ok", confidence: 0.9, evidence: [] }],
      "safe fallback patch",
      cfg,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("kill-switch-enabled");
  });
});
