import type { AppConfig } from "../config/env";
import type { IncidentSignalV1 } from "../types/incident";
import type { Message, Tool } from "@aws-sdk/client-bedrock-runtime";
import { executeAwsCli } from "../tools/aws-cli";
import { sendSlackHook } from "./slack-hooks";
import { configureGitWithAppToken, getGitHubAppInstallationToken } from "../identity/github-app";
import { ensureRepoWorkspace } from "./repo-workspace";
import { ONCALL_AGENT_SYSTEM_PROMPT } from "../llm/system-prompt";

const TOOLS: Tool[] = [
  {
    toolSpec: {
      name: "aws_cli",
      description: "Execute an AWS CLI command to inspect resources: CloudWatch logs/metrics, Lambda, EC2, DynamoDB, etc.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            service: { type: "string", description: "AWS service (e.g. logs, cloudwatch, lambda, ec2)" },
            command: { type: "string", description: "CLI command (e.g. filter-log-events, get-metric-statistics)" },
            args: { type: "array", items: { type: "string" }, description: "Additional CLI arguments" },
          },
          required: ["service", "command"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "send_slack_message",
      description: "Send a status update or finding to the team Slack channel.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            message: { type: "string", description: "Message text" },
          },
          required: ["message"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "file_operation",
      description: "Read, write, edit, or list files in the repo workspace. Use 'edit' for targeted changes.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            operation: { type: "string", enum: ["read", "write", "edit", "list"] },
            path: { type: "string", description: "File path relative to repo root" },
            content: { type: "string", description: "File content (for write)" },
            old_string: { type: "string", description: "String to find (for edit)" },
            new_string: { type: "string", description: "Replacement string (for edit)" },
          },
          required: ["operation", "path"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "git",
      description: "Run a git command in the repo workspace. Use for branching, staging, committing, pushing.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            args: { type: "array", items: { type: "string" }, description: "Git command arguments" },
          },
          required: ["args"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "github_api",
      description: "Call the GitHub REST API. Use {owner} and {repo} as placeholders in paths.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            method: { type: "string", enum: ["GET", "POST", "PATCH", "PUT"] },
            path: { type: "string", description: "API path, e.g. /repos/{owner}/{repo}/pulls" },
            body: { type: "object", description: "Request body for POST/PATCH/PUT" },
          },
          required: ["method", "path"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "complete",
      description: "Call this when you have finished investigating and remediating the incident. Provide a summary of what you found and what you did.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Summary of investigation findings and actions taken" },
            hypothesis: { type: "string", description: "Root cause hypothesis" },
            remediation: { type: "string", description: "What remediation was applied, if any" },
            prUrl: { type: "string", description: "URL of the PR opened, if any" },
          },
          required: ["summary"],
        },
      },
    },
  },
];

export interface AgentLoopResult {
  summary: string;
  hypothesis?: string;
  remediation?: string;
  prUrl?: string;
}

export async function runAgentLoop(
  config: AppConfig,
  incident: IncidentSignalV1,
): Promise<AgentLoopResult> {
  const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
  const { fromIni } = await import("@aws-sdk/credential-providers");
  const { ensureTeleportSession } = await import("../identity/teleport-session");
  const { readFile, writeFile, readdir, mkdir } = await import("node:fs/promises");
  const { dirname, join } = await import("node:path");

  const awsProfile = await ensureTeleportSession(config);
  const region = config.llm.bedrockRegion ?? config.awsRegion;

  const bedrock = new BedrockRuntimeClient({
    region,
    ...(awsProfile && { credentials: fromIni({ profile: awsProfile }) }),
  });

  // Set up repo workspace + GitHub auth
  const workspace = await ensureRepoWorkspace(config);
  const repoPath = workspace.repoPath;
  let githubToken: string | undefined;

  if (config.github.appId && config.github.appPrivateKey && config.github.appInstallationId) {
    const appToken = await getGitHubAppInstallationToken({
      appId: config.github.appId,
      privateKey: config.github.appPrivateKey,
      installationId: config.github.appInstallationId,
    });
    githubToken = appToken.token;
    await configureGitWithAppToken(repoPath, githubToken, config.github.owner, config.github.repo);
  } else if (config.github.token) {
    githubToken = config.github.token;
    await configureGitWithAppToken(repoPath, githubToken, config.github.owner, config.github.repo);
  }

  const shouldExecute = (Bun.env.REMEDIATION_EXECUTE ?? "false").toLowerCase() === "true";
  const shouldOpenPr = (Bun.env.REMEDIATION_OPEN_PR ?? "false").toLowerCase() === "true";

  const systemPrompt = `${ONCALL_AGENT_SYSTEM_PROMPT}

Current configuration:
- Repository: ${config.github.owner}/${config.github.repo} (branch: ${config.github.baseBranch})
- AWS Region: ${config.awsRegion}
- Repo workspace: ${repoPath}
- Remediation execution: ${shouldExecute ? "ENABLED" : "DISABLED (investigate and propose only)"}
- PR creation: ${shouldOpenPr ? "ENABLED" : "DISABLED"}

You are processing an automated incident signal. There is no human in the loop.

Incident:
- ID: ${incident.incidentId}
- Source: ${incident.source}
- Service: ${incident.service}
- Severity: ${incident.severity}
- Summary: ${incident.summary}
- Detected at: ${incident.detectedAt}
${incident.correlationId ? `- Correlation ID: ${incident.correlationId}` : ""}

Your task:
1. Use aws_cli to investigate — pull CloudWatch logs, metrics, recent deployments, whatever is relevant to this service and incident.
2. Analyze the evidence and form a root cause hypothesis.
3. Send a Slack message summarizing your findings.
${shouldExecute ? `4. Write a code fix: create a branch, edit the relevant files, commit, push, and open a PR.
5. Send a Slack message with the PR link.` : "4. Propose a remediation approach in your summary (do not execute)."}
6. Call the 'complete' tool with your summary when done.

Use git commands with -C ${repoPath} for all git operations. All file paths should be relative to ${repoPath}.`;

  const messages: Message[] = [
    { role: "user", content: [{ text: "Begin incident investigation and remediation." }] },
  ];

  const maxTurns = config.agent.maxLoops;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await bedrock.send(new ConverseCommand({
      modelId: config.llm.model,
      system: [{ text: systemPrompt }],
      messages,
      toolConfig: { tools: TOOLS },
      inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
    }));

    const content = response.output?.message?.content ?? [];
    messages.push({ role: "assistant", content });

    if (response.stopReason !== "tool_use") {
      // Model stopped without calling a tool — treat as implicit completion
      const text = content.map((b) => b.text).filter(Boolean).join("\n");
      return { summary: text || "Agent completed without explicit summary." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolResults: any[] = [];

    for (const block of content) {
      if (!block.toolUse) continue;
      const { toolUseId, name, input: toolInput } = block.toolUse;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ti = (toolInput as Record<string, any>) ?? {};

      if (name === "complete") {
        return {
          summary: ti.summary ?? "No summary provided",
          hypothesis: ti.hypothesis,
          remediation: ti.remediation,
          prUrl: ti.prUrl,
        };
      }

      let result: string;

      if (name === "aws_cli") {
        console.log(JSON.stringify({ event: "agent.tool", tool: "aws_cli", service: ti.service, command: ti.command }));
        const r = await executeAwsCli(config, {
          service: ti.service,
          command: ti.command,
          args: ti.args ?? [],
          reason: `incident:${incident.incidentId}`,
        });
        result = r.success ? r.stdout : `Error: ${r.stderr}`;
      } else if (name === "send_slack_message") {
        console.log(JSON.stringify({ event: "agent.tool", tool: "slack", preview: ti.message?.slice(0, 100) }));
        await sendSlackHook({
          event: "agent_update",
          incidentId: incident.incidentId,
          correlationId: incident.correlationId,
          message: ti.message,
        });
        result = "Message sent to Slack.";
      } else if (name === "file_operation") {
        const fullPath = join(repoPath, ti.path);
        console.log(JSON.stringify({ event: "agent.tool", tool: "file", operation: ti.operation, path: ti.path }));
        try {
          if (ti.operation === "read") {
            result = await readFile(fullPath, "utf-8");
          } else if (ti.operation === "write") {
            await mkdir(dirname(fullPath), { recursive: true });
            await writeFile(fullPath, ti.content, "utf-8");
            result = `Written ${ti.content.length} chars to ${ti.path}`;
          } else if (ti.operation === "edit") {
            const existing = await readFile(fullPath, "utf-8");
            if (!existing.includes(ti.old_string)) {
              result = `Error: old_string not found in ${ti.path}`;
            } else {
              await writeFile(fullPath, existing.replace(ti.old_string, ti.new_string), "utf-8");
              result = `Edited ${ti.path}`;
            }
          } else if (ti.operation === "list") {
            const entries = await readdir(fullPath, { withFileTypes: true });
            result = entries.map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`).join("\n");
          } else {
            result = `Unknown operation: ${ti.operation}`;
          }
        } catch (e: unknown) {
          result = `File error: ${(e as Error).message}`;
        }
      } else if (name === "git") {
        const args = ti.args as string[];
        console.log(JSON.stringify({ event: "agent.tool", tool: "git", args }));
        try {
          const proc = Bun.spawn(["git", "-C", repoPath, ...args], {
            stdout: "pipe",
            stderr: "pipe",
          });
          const [stdout, stderr, exitCode] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
            proc.exited,
          ]);
          result = exitCode === 0 ? stdout || "OK" : `Error: ${stderr}`;
        } catch (e: unknown) {
          result = `Git error: ${(e as Error).message}`;
        }
      } else if (name === "github_api") {
        const resolvedPath = (ti.path as string)
          .replace(/\{owner\}/g, config.github.owner)
          .replace(/\{repo\}/g, config.github.repo);
        console.log(JSON.stringify({ event: "agent.tool", tool: "github_api", method: ti.method, path: resolvedPath }));
        if (!githubToken) {
          result = "No GitHub credentials configured";
        } else {
          try {
            const res = await fetch(`https://api.github.com${resolvedPath}`, {
              method: ti.method,
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                ...(ti.body && { "Content-Type": "application/json" }),
              },
              ...(ti.body && { body: JSON.stringify(ti.body) }),
            });
            result = await res.text();
          } catch (e: unknown) {
            result = `GitHub API error: ${(e as Error).message}`;
          }
        }
      } else {
        result = `Unknown tool: ${name}`;
      }

      toolResults.push({ toolResult: { toolUseId, content: [{ text: result }] } });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return { summary: "Agent reached maximum turn limit without completing." };
}
