import { describe, expect, test } from "bun:test";
import { ensureRepoWorkspace } from "./repo-workspace";
import type { AppConfig } from "../config/env";

describe("ensureRepoWorkspace", () => {
  test("returns workspace info", async () => {
    const config: AppConfig = {
      github: {
        owner: "allenheltondev",
        repo: "oncall-agent",
        baseBranch: "main",
      },
    } as AppConfig;

    const workspace = await ensureRepoWorkspace(config, {
      baseDir: "/tmp/oncall-test-workspace",
    });

    expect(workspace.owner).toBe("allenheltondev");
    expect(workspace.repo).toBe("oncall-agent");
    expect(workspace.repoPath).toContain("allenheltondev/oncall-agent");
  });
});
