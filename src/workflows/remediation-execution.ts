import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { $ } from "bun";
import type { RemediationProposal } from "./remediation";

export interface RemediationExecutionResult {
  branchName: string;
  commitSha: string;
  prUrl?: string;
}

export interface RemediationExecutionOptions {
  repoPath?: string;
  openPullRequest?: boolean;
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
  const repoPath = opts.repoPath ?? process.cwd();
  const expectedRepo = opts.expectedRepo;
  const baseBranch = opts.baseBranch ?? "main";

  await ensureRepositoryBinding(repoPath, expectedRepo);
  await ensureCleanWorktree(repoPath, opts.allowDirtyWorktree);

  const artifactsDir = join(repoPath, "artifacts", "remediation");
  await mkdir(artifactsDir, { recursive: true });

  await $`git -C ${repoPath} checkout -B ${proposal.branchName}`;

  const notePath = join(artifactsDir, `${proposal.branchName.replace(/[\/]/g, "-")}.md`);
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

    try {
      const out = await $`gh pr create --repo ${expectedRepo} --base ${baseBranch} --head ${proposal.branchName} --title ${proposal.prTitle} --body ${proposal.prBody}`.text();
      prUrl = out.trim().split(/\s+/).find((v) => v.startsWith("http"));
    } catch (error) {
      throw new Error(
        `Remediation branch pushed but PR creation failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return { branchName: proposal.branchName, commitSha, prUrl };
}
