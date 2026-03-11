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

  test("unknown command returns error", async () => {
    const code = await runCli(["wat"]);
    expect(code).toBe(1);
  });
});
