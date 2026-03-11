import { describe, expect, test } from "bun:test";
import { buildHypothesisHook } from "./slack-hooks";

describe("buildHypothesisHook", () => {
  test("includes top hypothesis details when present", () => {
    const payload = buildHypothesisHook({
      incidentId: "inc-slack-1",
      correlationId: "corr-slack-1",
      topHypothesis: {
        id: "downstream-timeout",
        summary: "timeout path",
        confidence: 0.82,
        evidence: ["timeout in logs"],
      },
    });

    expect(payload.event).toBe("working_hypothesis");
    expect(payload.message).toContain("downstream-timeout");
    expect(payload.details?.confidence).toBe(0.82);
  });
});
