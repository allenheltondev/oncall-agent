import { describe, expect, test } from "bun:test";
import { runDoctor } from "./doctor";

describe("runDoctor", () => {
  test("returns check matrix", async () => {
    Bun.env.MOMENTO_API_KEY = "mom-key";
    Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
    Bun.env.TELEPORT_CLUSTER = "main";
    Bun.env.GITHUB_OWNER = "allenheltondev";
    Bun.env.GITHUB_REPO = "oncall-agent";
    Bun.env.SLACK_CHANNEL = "#oncall";
    Bun.env.OPENAI_API_KEY = "sk-test";
    Bun.env.OPENAI_MODEL = "gpt-5.3-codex";

    const result = await runDoctor();
    expect(result.checks.length).toBeGreaterThanOrEqual(5);
    expect(result.ok).toBe(true);
  });
});
