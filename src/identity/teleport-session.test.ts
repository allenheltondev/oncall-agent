import { describe, expect, test } from "bun:test";
import { checkTeleportSession, ensureTeleportSession } from "./teleport-session";
import type { AppConfig } from "../config/env";

describe("checkTeleportSession", () => {
  test("returns invalid when tsh status fails", async () => {
    const config: AppConfig = {
      teleport: {
        proxy: "teleport.example.com:443",
        cluster: "main",
        audience: "oncall-agent",
        mockIdentity: false,
      },
    } as AppConfig;

    const status = await checkTeleportSession(config);
    expect(status.valid).toBe(false);
  });
});

describe("ensureTeleportSession", () => {
  test("skips login in mock mode", async () => {
    const config: AppConfig = {
      teleport: {
        proxy: "teleport.example.com:443",
        cluster: "main",
        audience: "oncall-agent",
        mockIdentity: true,
      },
    } as AppConfig;

    await expect(ensureTeleportSession(config)).resolves.toBeUndefined();
  });
});
