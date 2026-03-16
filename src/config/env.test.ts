import { describe, expect, test } from "bun:test";
import { loadConfig } from "./env";

describe("loadConfig", () => {
  test("loads defaults", async () => {
    const original = { ...Bun.env };
    delete Bun.env.NODE_ENV;
    delete Bun.env.LOG_LEVEL;

    const config = await loadConfig();
    expect(config.nodeEnv).toBe("development");
    expect(config.logLevel).toBe("info");
    expect(config.awsRegion).toBe("us-east-1");

    Object.assign(Bun.env, original);
  });

  test("throws on invalid NODE_ENV", () => {
    const original = Bun.env.NODE_ENV;
    Bun.env.NODE_ENV = "invalid";
    expect(loadConfig()).rejects.toThrow("Invalid NODE_ENV");
    if (original) Bun.env.NODE_ENV = original;
    else delete Bun.env.NODE_ENV;
  });
});
