import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { $ } from "bun";
import type { RemediationProposal } from "./remediation";
import { ensureRepoWorkspace } from "./repo-workspace";
import { getGitHubAppInstallationToken, configureGitWithAppToken } from "../identity/github-app";
import type { AppConfig } from "../config/env";
export interface RemediationExecutionResult {
  branchName: string;
  commitSha: string;
  prUrl?: string;
}

export interface RemediationExecutionOptions {
  repoPath?: string;
  config?: AppConfig;
  useWorkspace?: boolean;  openPullRequest?: boolean;
  expectedRepo?: string; // owner/repo
  baseBranch?: string;
  allowDirtyWorktree?: boolean;
}

export function parseGithubRepoFromRemote(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  const match = trimmed.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

async function ensureRepositoryBinding(repoPath: string, expectedRepo?: string): Promise<void> {
  if (!expectedRepo) return;

  const remote = (await $`git -C ${repoPath} remote get-url origin`.text()).trim();
  const parsed = parseGithubRepoFromRemote(remote);
  if (!parsed || parsed !== expectedRepo.toLowerCase()) {
    throw new Error(
      `Repository binding mismatch: expected ${expectedRepo}, found ${parsed ?? remote}`,
    );
  }
}

async function ensureCleanWorktree(repoPath: string, allowDirty = false): Promise<void> {
  if (allowDirty) return;
  const status = (await $`git -C ${repoPath} status --porcelain`.text()).trim();
  if (status.length > 0) {
    throw new Error("Working tree is not clean; refusing remediation execution");
  }
}

export async function executeRemediationProposal(
  proposal: RemediationProposal,
  opts: RemediationExecutionOptions = {},
): Promise<RemediationExecutionResult> {
  let repoPath = opts.repoPath ?? process.cwd();
  let githubToken: string | undefined;

  // If useWorkspace is enabled and config provided, clone/update repo
  if (opts.useWorkspace && opts.config) {
    const workspace = await ensureRepoWorkspace(opts.config);
    repoPath = workspace.repoPath;

    // Configure authentication: GitHub App or PAT
    if (opts.config.github.appId && opts.config.github.appPrivateKey && opts.config.github.appInstallationId) {
      const appToken = await getGitHubAppInstallationToken({
        appId: opts.config.github.appId,
        privateKey: opts.config.github.appPrivateKey,
        installationId: opts.config.github.appInstallationId,
      });
      githubToken = appToken.token;
      await configureGitWithAppToken(repoPath, githubToken, opts.config.github.owner, opts.config.github.repo);
    } else if (opts.config.github.token) {
      githubToken = opts.config.github.token;
      await configureGitWithAppToken(repoPath, githubToken, opts.config.github.owner, opts.config.github.repo);
    }
  }

  const expectedRepo = opts.expectedRepo;
  const baseBranch = opts.baseBranch ?? "main";

  await ensureRepositoryBinding(repoPath, expectedRepo);
  await ensureCleanWorktree(repoPath, opts.allowDirtyWorktree);

  const artifactsDir = join(repoPath, "artifacts", "remediation");
  await mkdir(artifactsDir, { recursive: true });

  await $`git -C ${repoPath} checkout -B ${proposal.branchName}`;

  const notePath = join(artifactsDir, `${proposal.branchName.replace(/[/]/g, "-")}.md`);
  await mkdir(dirname(notePath), { recursive: true });
  await writeFile(
    notePath,
    `# Remediation Proposal\n\n${proposal.patchSummary}\n\n## PR Body\n\n${proposal.prBody}\n`,
    "utf-8",
  );

  await $`git -C ${repoPath} add ${notePath}`;
  await $`git -C ${repoPath} commit -m ${proposal.commitMessage}`;
  const commitSha = (await $`git -C ${repoPath} rev-parse HEAD`.text()).trim();

  await $`git -C ${repoPath} push -u origin ${proposal.branchName}`;

  let prUrl: string | undefined;
  if (opts.openPullRequest) {
    if (!expectedRepo) {
      throw new Error("expectedRepo is required when openPullRequest=true");
    }
    if (!githubToken) {
      throw new Error("GitHub token is required when openPullRequest=true");
    }

    const [owner, repo] = expectedRepo.split("/");
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: proposal.prTitle,
        body: proposal.prBody,
        head: proposal.branchName,
        base: baseBranch,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Remediation branch pushed but PR creation failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as { html_url: string };
    prUrl = data.html_url;
  }

  return { branchName: proposal.branchName, commitSha, prUrl };
}
