import { describe, expect, test } from "bun:test";
import { loadIdentityMap, resolveEnvironment } from "./identity-map";

describe("identity-map", () => {
  test("loads identity map and resolves dev environment", async () => {
    const map = await loadIdentityMap();
    const dev = resolveEnvironment(map, "dev");
    expect(dev.aws.accountId).toBe("123456789012");
    expect(dev.github.repo).toBe("oncall-agent");
  });
});
