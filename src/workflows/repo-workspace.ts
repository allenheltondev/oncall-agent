import { mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AppConfig } from "../config/env";

export interface WorkspaceOptions {
  baseDir?: string;
  cleanClone?: boolean;
}

export interface WorkspaceInfo {
  repoPath: string;
  owner: string;
  repo: string;
  branch: string;
}

async function runGit(args: string[], repoPath?: string): Promise<string> {
  const proc = Bun.spawn(
    repoPath ? ["git", "-C", repoPath, ...args] : ["git", ...args],
    {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `git ${args.join(" ")} failed with exit code ${exitCode}`);
  }

  return stdout;
}

async function readOriginRemote(repoPath: string): Promise<string | null> {
  try {
    const gitConfig = await readFile(join(repoPath, ".git", "config"), "utf-8");
    const originSection = gitConfig.match(/\[remote "origin"\]([\s\S]*?)(?:\n\[|$)/);
    const urlMatch = originSection?.[1]?.match(/^\s*url\s*=\s*(.+)$/m);
    return urlMatch?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function ensureRepoWorkspace(
  config: AppConfig,
  opts: WorkspaceOptions = {},
): Promise<WorkspaceInfo> {
  const baseDir = resolve(opts.baseDir ?? join(process.cwd(), ".workspace"));
  const repoSlug = `${config.github.owner}/${config.github.repo}`;
  const repoPath = join(baseDir, config.github.owner, config.github.repo);

  await mkdir(repoPath, { recursive: true });

  // Check if already cloned
  const remote = await readOriginRemote(repoPath);
  if (remote?.includes(repoSlug)) {
    try {
      // Already cloned, just fetch latest
      await runGit(["fetch", "origin"], repoPath);
      await runGit(["checkout", config.github.baseBranch], repoPath);
      await runGit(["pull", "origin", config.github.baseBranch], repoPath);
    } catch {
      // Keep using the existing workspace when network or sandbox restrictions
      // prevent syncing, instead of failing before any local repo work can start.
    }

    return {
      repoPath,
      owner: config.github.owner,
      repo: config.github.repo,
      branch: config.github.baseBranch,
    };
  }

  // Clone the repo
  const cloneUrl = `https://github.com/${repoSlug}.git`;
  await rm(repoPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  await runGit(["clone", cloneUrl, repoPath]);
  await runGit(["checkout", config.github.baseBranch], repoPath);

  return {
    repoPath,
    owner: config.github.owner,
    repo: config.github.repo,
    branch: config.github.baseBranch,
  };
}

export async function cleanWorkspace(baseDir?: string): Promise<void> {
  const dir = resolve(baseDir ?? join(process.cwd(), ".workspace"));
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
