import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { $ } from "bun";
import type { RemediationProposal } from "./remediation";

export interface RemediationExecutionResult {
  branchName: string;
  commitSha: string;
  prUrl?: string;
}

export async function executeRemediationProposal(
  proposal: RemediationProposal,
  opts: { repoPath?: string; openPullRequest?: boolean } = {},
): Promise<RemediationExecutionResult> {
  const repoPath = opts.repoPath ?? process.cwd();
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
    try {
      const out = await $`gh pr create --repo allenheltondev/oncall-agent --base main --head ${proposal.branchName} --title ${proposal.prTitle} --body ${proposal.prBody}`.text();
      prUrl = out.trim().split(/\s+/).find((v) => v.startsWith("http"));
    } catch {
      // leave undefined; caller can handle partial execution
    }
  }

  return { branchName: proposal.branchName, commitSha, prUrl };
}
