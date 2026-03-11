import { describe, expect, test } from "bun:test";
import { parseGithubRepoFromRemote } from "./remediation-execution";

describe("parseGithubRepoFromRemote", () => {
  test("parses https remote", () => {
    expect(parseGithubRepoFromRemote("https://github.com/allenheltondev/oncall-agent.git")).toBe(
      "allenheltondev/oncall-agent",
    );
  });

  test("parses ssh remote", () => {
    expect(parseGithubRepoFromRemote("git@github.com:allenheltondev/oncall-agent.git")).toBe(
      "allenheltondev/oncall-agent",
    );
  });

  test("returns null for non-github remote", () => {
    expect(parseGithubRepoFromRemote("https://gitlab.com/acme/repo.git")).toBeNull();
  });
});
