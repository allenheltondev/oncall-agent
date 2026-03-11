import { describe, expect, test } from "bun:test";
import { assembleIncidentContext } from "./incident-context";
import { generateHypotheses } from "./hypothesis-engine";

describe("generateHypotheses", () => {
  test("ranks hypotheses by confidence", () => {
    const context = assembleIncidentContext({
      incidentId: "inc-h-1",
      service: "api",
      evidence: {
        logs: {
          adapter: "cloudwatch-logs",
          entries: [{ timestamp: new Date().toISOString(), message: "dependency timeout detected" }],
        },
        metrics: {
          adapter: "cloudwatch-metrics",
          points: [{ timestamp: new Date().toISOString(), value: 0.2 }],
        },
        deploy: {
          adapter: "deploy-metadata",
          commitSha: "abc123",
          deployedAt: new Date().toISOString(),
          pipeline: "staging-deploy",
        },
        errors: [],
      },
    });

    const hypotheses = generateHypotheses(context);
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses[0]?.confidence).toBeGreaterThanOrEqual(hypotheses[1]?.confidence ?? 0);
  });

  test("emits fallback when evidence is sparse", () => {
    const context = assembleIncidentContext({
      incidentId: "inc-h-2",
      service: "worker",
      evidence: { errors: [] },
    });

    const hypotheses = generateHypotheses(context);
    expect(hypotheses[0]?.id).toBe("insufficient-evidence");
  });
});
