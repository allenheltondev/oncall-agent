import { describe, expect, test } from "bun:test";
import { CodexClient } from "./codex-client";

describe("CodexClient", () => {
  test("parses completion payload", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          model: "gpt-5.3-codex",
          choices: [{ message: { content: "Remediation summary" } }],
          usage: { prompt_tokens: 100, completion_tokens: 25 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as unknown as typeof fetch;

    const client = new CodexClient({ apiKey: "test-key", model: "gpt-5.3-codex" });
    const result = await client.complete({ taskType: "status_summary", prompt: "hello" });

    expect(result.provider).toBe("codex");
    expect(result.text).toContain("Remediation");
    expect(result.usage?.inputTokens).toBe(100);

    globalThis.fetch = originalFetch;
  });
});
