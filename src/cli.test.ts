import { describe, expect, test } from "bun:test";
import { runCli } from "./cli";
import { rm, readFile } from "node:fs/promises";

describe("cli", () => {
  test("config validate returns success", async () => {
    const code = await runCli(["config", "validate"]);
    expect(code).toBe(0);
  });

  test("config llm set writes env values", async () => {
    const envFile = ".env.cli-test";
    await rm(envFile, { force: true });

    const code = await runCli([
      "config",
      "llm",
      "set",
      "--env-file",
      envFile,
      "--api-key",
      "sk-test-1234567890",
      "--model",
      "gpt-5.3-codex",
    ]);

    expect(code).toBe(0);
    const content = await readFile(envFile, "utf-8");
    expect(content).toContain("OPENAI_API_KEY=sk-test-1234567890");
    expect(content).toContain("OPENAI_MODEL=gpt-5.3-codex");

    await rm(envFile, { force: true });
  });

  test("setup non-interactive writes config artifacts", async () => {
    const envFile = ".env.setup-cli-test";
    const configPath = "config/identity-map.cli-test.json";
    await rm(envFile, { force: true });
    await rm(configPath, { force: true });

    const code = await runCli([
      "setup",
      "--non-interactive",
      "--env-file",
      envFile,
      "--config",
      configPath,
      "--profile",
      "dev",
      "--momento-api-key",
      "mom-test",
      "--momento-cache",
      "oncall-agent",
      "--momento-topic",
      "incidents",
      "--teleport-proxy",
      "teleport.example.com:443",
      "--teleport-cluster",
      "main",
      "--teleport-audience",
      "oncall-agent",
      "--teleport-mock",
      "true",
      "--github-owner",
      "allenheltondev",
      "--github-repo",
      "oncall-agent",
      "--github-base-branch",
      "main",
      "--slack-token",
      "xoxb-test",
      "--slack-channel",
      "#oncall",
      "--openai-api-key",
      "sk-test",
      "--openai-model",
      "gpt-5.3-codex",
      "--openai-base-url",
      "https://api.openai.com/v1",
      "--aws-account-id",
      "123456789012",
    ]);

    expect(code).toBe(0);
    const env = await readFile(envFile, "utf-8");
    expect(env).toContain("MOMENTO_API_KEY=mom-test");
    expect(env).toContain("SLACK_CHANNEL=#oncall");

    await rm(envFile, { force: true });
    await rm(configPath, { force: true });
  });

  test("unknown command returns error", async () => {
    const code = await runCli(["wat"]);
    expect(code).toBe(1);
  });
});
