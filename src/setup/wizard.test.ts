import { describe, expect, test } from "bun:test";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { runSetupWizard } from "./wizard";

describe("setup wizard", () => {
  test("writes env and identity map in non-interactive mode", async () => {
    const envFile = ".env.setup-test";
    const mapFile = "config/identity-map.setup-test.json";

    await rm(envFile, { force: true });
    await rm(mapFile, { force: true });

    await runSetupWizard({
      nonInteractive: true,
      envFile,
      identityMapPath: mapFile,
      profile: "dev",
      momentoApiKey: "mom-key",
      momentoCacheName: "oncall-agent",
      momentoTopicName: "incidents",
      teleportProxy: "teleport.example.com:443",
      teleportCluster: "main",
      teleportAudience: "oncall-agent",
      teleportMockIdentity: "true",
      githubOwner: "allenheltondev",
      githubRepo: "oncall-agent",
      githubBaseBranch: "main",
      slackToken: "xoxb-test",
      slackChannel: "#oncall",
      openaiApiKey: "sk-test",
      openaiModel: "gpt-5.3-codex",
      openaiBaseUrl: "https://api.openai.com/v1",
      awsAccountId: "123456789012",
    });

    const env = await readFile(envFile, "utf-8");
    const map = await readFile(mapFile, "utf-8");

    expect(env).toContain("OPENAI_MODEL=gpt-5.3-codex");
    expect(env).toContain("SLACK_CHANNEL=#oncall");
    expect(map).toContain("identity-map.v1");
    expect(map).toContain("123456789012");

    await rm(envFile, { force: true });
    await rm(mapFile, { force: true });
  });

  test("respects module selection and can skip identity map", async () => {
    const envFile = ".env.setup-modules-only";
    const mapFile = "config/identity-map.modules-only.json";

    await rm(envFile, { force: true });
    await rm(mapFile, { force: true });

    await runSetupWizard({
      nonInteractive: true,
      modules: "llm",
      envFile,
      identityMapPath: mapFile,
      openaiApiKey: "sk-modules-only",
      openaiModel: "gpt-5.3-codex",
    });

    const env = await readFile(envFile, "utf-8");
    expect(env).toContain("OPENAI_API_KEY=sk-modules-only");
    expect(existsSync(mapFile)).toBe(false);

    await rm(envFile, { force: true });
    await rm(mapFile, { force: true });
  });
});
