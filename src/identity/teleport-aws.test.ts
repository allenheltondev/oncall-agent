import { describe, expect, test } from "bun:test";
import { loadConfig } from "../config/env";
import { requestAwsRuntimeAccess } from "./teleport-aws";

describe("requestAwsRuntimeAccess", () => {
  test("fails closed without Teleport proxy/cluster", async () => {
    const originalProxy = Bun.env.TELEPORT_PROXY;
    const originalCluster = Bun.env.TELEPORT_CLUSTER;
    const originalMock = Bun.env.TELEPORT_MOCK_IDENTITY;

    delete Bun.env.TELEPORT_PROXY;
    delete Bun.env.TELEPORT_CLUSTER;
    Bun.env.TELEPORT_MOCK_IDENTITY = "false";

    const config = loadConfig();
    await expect(
      requestAwsRuntimeAccess(config, {
        scope: "cloudwatch:read",
        reason: "incident triage",
      }),
    ).rejects.toThrow("Teleport proxy/cluster");

    if (originalProxy) Bun.env.TELEPORT_PROXY = originalProxy;
    else delete Bun.env.TELEPORT_PROXY;
    if (originalCluster) Bun.env.TELEPORT_CLUSTER = originalCluster;
    else delete Bun.env.TELEPORT_CLUSTER;
    if (originalMock) Bun.env.TELEPORT_MOCK_IDENTITY = originalMock;
    else delete Bun.env.TELEPORT_MOCK_IDENTITY;
  });

  test("returns mock credentials when mock mode is enabled", async () => {
    const originalProxy = Bun.env.TELEPORT_PROXY;
    const originalCluster = Bun.env.TELEPORT_CLUSTER;
    const originalMock = Bun.env.TELEPORT_MOCK_IDENTITY;

    Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
    Bun.env.TELEPORT_CLUSTER = "main";
    Bun.env.TELEPORT_MOCK_IDENTITY = "true";

    const config = loadConfig();
    const grant = await requestAwsRuntimeAccess(config, {
      scope: "cloudwatch:read",
      reason: "incident triage",
    });

    expect(grant.scope).toBe("cloudwatch:read");
    expect(grant.accessKeyId).toBe("mock-access-key-id");

    if (originalProxy) Bun.env.TELEPORT_PROXY = originalProxy;
    else delete Bun.env.TELEPORT_PROXY;
    if (originalCluster) Bun.env.TELEPORT_CLUSTER = originalCluster;
    else delete Bun.env.TELEPORT_CLUSTER;
    if (originalMock) Bun.env.TELEPORT_MOCK_IDENTITY = originalMock;
    else delete Bun.env.TELEPORT_MOCK_IDENTITY;
  });
});
