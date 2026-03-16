import { describe, expect, test } from "bun:test";
import { getGitHubAppInstallationToken } from "./github-app";

describe("getGitHubAppInstallationToken", () => {
  test("requires valid app config", async () => {
    const config = {
      appId: "123456",
      privateKey: "invalid-key",
      installationId: "789012",
    };

    await expect(getGitHubAppInstallationToken(config)).rejects.toThrow();
  });
});
