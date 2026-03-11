import { describe, expect, test } from "bun:test";
import { runCli } from "./cli";

describe("cli", () => {
  test("config validate returns success", async () => {
    const code = await runCli(["config", "validate"]);
    expect(code).toBe(0);
  });

  test("unknown command returns error", async () => {
    const code = await runCli(["wat"]);
    expect(code).toBe(1);
  });
});
