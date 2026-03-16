import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
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

export async function ensureRepoWorkspace(
  config: AppConfig,
  opts: WorkspaceOptions = {},
): Promise<WorkspaceInfo> {
  const baseDir = opts.baseDir ?? join(process.cwd(), ".workspace");
  const repoSlug = `${config.github.owner}/${config.github.repo}`;
  const repoPath = join(baseDir, config.github.owner, config.github.repo);

  await mkdir(repoPath, { recursive: true });

  // Check if already cloned
  try {
    const remote = await $`git -C ${repoPath} remote get-url origin`.text();
    if (remote.includes(repoSlug)) {
      // Already cloned, just fetch latest
      await $`git -C ${repoPath} fetch origin`;
      await $`git -C ${repoPath} checkout ${config.github.baseBranch}`;
      await $`git -C ${repoPath} pull origin ${config.github.baseBranch}`;
      
      return {
        repoPath,
        owner: config.github.owner,
        repo: config.github.repo,
        branch: config.github.baseBranch,
      };
    }
  } catch {
    // Not a git repo or doesn't exist, proceed with clone
  }

  // Clone the repo
  const cloneUrl = `https://github.com/${repoSlug}.git`;
  await $`git clone ${cloneUrl} ${repoPath}`;
  await $`git -C ${repoPath} checkout ${config.github.baseBranch}`;

  return {
    repoPath,
    owner: config.github.owner,
    repo: config.github.repo,
    branch: config.github.baseBranch,
  };
}

export async function cleanWorkspace(baseDir?: string): Promise<void> {
  const dir = baseDir ?? join(process.cwd(), ".workspace");
  await $`rm -rf ${dir}`;
}
