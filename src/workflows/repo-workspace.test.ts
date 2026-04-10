import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "path";
import { ensureRepoWorkspace } from "./repo-workspace";
import type { AppConfig } from "../config/env";

describe("ensureRepoWorkspace", () => {
  test("returns workspace info", async () => {
    const baseDir = path.join(process.cwd(), ".tmp", "oncall-test-workspace");
    const localRepoPath = path.join(baseDir, "allenheltondev", "oncall-agent");

    await rm(baseDir, { recursive: true, force: true });

    try {
      await mkdir(path.dirname(localRepoPath), { recursive: true });
      execFileSync("git", ["init", "-b", "main", localRepoPath], { stdio: "ignore" });
      execFileSync("git", ["-C", localRepoPath, "config", "user.name", "Test User"], { stdio: "ignore" });
      execFileSync("git", ["-C", localRepoPath, "config", "user.email", "test@example.com"], { stdio: "ignore" });
      await writeFile(path.join(localRepoPath, "README.md"), "# test\n", "utf-8");
      execFileSync("git", ["-C", localRepoPath, "add", "README.md"], { stdio: "ignore" });
      execFileSync("git", ["-C", localRepoPath, "commit", "-m", "seed"], { stdio: "ignore" });
      execFileSync("git", ["-C", localRepoPath, "remote", "add", "origin", "https://github.com/allenheltondev/oncall-agent.git"], { stdio: "ignore" });

      const config: AppConfig = {
        github: {
          owner: "allenheltondev",
          repo: "oncall-agent",
          baseBranch: "main",
        },
      } as AppConfig;

      const workspace = await ensureRepoWorkspace(config, {
        baseDir,
      });

      expect(workspace.owner).toBe("allenheltondev");
      expect(workspace.repo).toBe("oncall-agent");
      expect(workspace.repoPath).toContain("allenheltondev" + path.sep + "oncall-agent");
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }
  });
});
