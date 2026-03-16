import { describe, expect, test } from "bun:test";
import { loadConfig } from "../config/env";
import { requestGithubRuntimeAccess } from "./teleport-github";

describe("requestGithubRuntimeAccess", () => {
  test("fails closed without teleport settings", async () => {
    const oldProxy = Bun.env.TELEPORT_PROXY;
    const oldCluster = Bun.env.TELEPORT_CLUSTER;
    const oldMock = Bun.env.TELEPORT_MOCK_IDENTITY;

    delete Bun.env.TELEPORT_PROXY;
    delete Bun.env.TELEPORT_CLUSTER;
    Bun.env.TELEPORT_MOCK_IDENTITY = "false";

    const config = await loadConfig();
    await expect(
      requestGithubRuntimeAccess(config, { scope: "repo:read", reason: "incident remediation" }),
    ).rejects.toThrow("Teleport proxy/cluster");

    if (oldProxy) Bun.env.TELEPORT_PROXY = oldProxy; else delete Bun.env.TELEPORT_PROXY;
    if (oldCluster) Bun.env.TELEPORT_CLUSTER = oldCluster; else delete Bun.env.TELEPORT_CLUSTER;
    if (oldMock) Bun.env.TELEPORT_MOCK_IDENTITY = oldMock; else delete Bun.env.TELEPORT_MOCK_IDENTITY;
  });

  test("returns mock scoped token when enabled", async () => {
    Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
    Bun.env.TELEPORT_CLUSTER = "main";
    Bun.env.TELEPORT_MOCK_IDENTITY = "true";

    const config = await loadConfig();
    const grant = await requestGithubRuntimeAccess(config, {
      scope: "pr:create",
      reason: "create remediation PR",
    });

    expect(grant.scope).toBe("pr:create");
    expect(grant.repository).toBe("allenheltondev/oncall-agent");
  });
});
