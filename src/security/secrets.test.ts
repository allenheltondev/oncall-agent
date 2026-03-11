import { describe, expect, test } from "bun:test";
import { maskSecret, redactEnvMap } from "./secrets";

describe("secrets", () => {
  test("maskSecret masks long values", () => {
    expect(maskSecret("sk-1234567890")).toBe("sk-1...7890");
  });

  test("redactEnvMap masks known secret keys", () => {
    const redacted = redactEnvMap({
      OPENAI_API_KEY: "sk-1234567890",
      OPENAI_MODEL: "gpt-5.3-codex",
      SLACK_WEBHOOK_URL: "https://hooks.slack.test/abc",
    });

    expect(redacted.OPENAI_API_KEY).toContain("...");
    expect(redacted.OPENAI_MODEL).toBe("gpt-5.3-codex");
    expect(redacted.SLACK_WEBHOOK_URL).toContain("...");
  });
});
