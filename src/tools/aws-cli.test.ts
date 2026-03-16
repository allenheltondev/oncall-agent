import { describe, expect, test } from "bun:test";
import { executeAwsCli } from "./aws-cli";
import type { AppConfig } from "../config/env";

describe("executeAwsCli", () => {
  test("executes aws cli with runtime credentials", async () => {
    const config: AppConfig = {
      awsRegion: "us-east-1",
      teleport: {
        proxy: "teleport.example.com:443",
        cluster: "main",
        audience: "oncall-agent",
        mockIdentity: true,
      },
    } as AppConfig;

    const result = await executeAwsCli(config, {
      service: "sts",
      command: "get-caller-identity",
      reason: "test:cli-tool",
    });

    expect(result).toHaveProperty("stdout");
    expect(result).toHaveProperty("stderr");
    expect(result).toHaveProperty("exitCode");
    expect(result).toHaveProperty("success");
  });
});
