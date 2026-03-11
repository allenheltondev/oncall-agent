import { describe, expect, test } from "bun:test";
import { LlmOrchestrator } from "./orchestrator";
import type { LlmClient } from "./types";

const mockClient: LlmClient = {
  async complete() {
    return {
      text: "ok",
      model: "mock-model",
      provider: "mock",
      latencyMs: 1,
      usage: { inputTokens: 10, outputTokens: 5 },
    };
  },
};

describe("LlmOrchestrator", () => {
  test("runs task through client", async () => {
    const orchestrator = new LlmOrchestrator({
      client: mockClient,
      routing: { defaultModel: "mock-model" },
    });

    const response = await orchestrator.run("incident_analysis", "test prompt");
    expect(response.text).toBe("ok");
    expect(response.provider).toBe("mock");
  });
});
