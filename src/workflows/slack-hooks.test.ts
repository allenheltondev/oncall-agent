import { describe, expect, test } from "bun:test";
import { buildHypothesisHook, sendSlackHook } from "./slack-hooks";

describe("slack hooks", () => {
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

  test("webhook delivery path succeeds", async () => {
    const originalFetch = globalThis.fetch;
    const originalWebhook = Bun.env.SLACK_WEBHOOK_URL;

    Bun.env.SLACK_WEBHOOK_URL = "https://example.test/slack";
    globalThis.fetch = (async () =>
      new Response("ok", { status: 200 })) as unknown as typeof fetch;

    await sendSlackHook({
      event: "problem_detected",
      incidentId: "inc-slack-2",
      message: "detected",
    });

    globalThis.fetch = originalFetch;
    if (originalWebhook) Bun.env.SLACK_WEBHOOK_URL = originalWebhook;
    else delete Bun.env.SLACK_WEBHOOK_URL;
  });
});
