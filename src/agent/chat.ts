import type { AppConfig } from "../config/env";
import type { Message, Tool } from "@aws-sdk/client-bedrock-runtime";
import { executeAwsCli } from "../tools/aws-cli";
import { ensureTeleportSession } from "../identity/teleport-session";
import { getGitHubAppInstallationToken } from "../identity/github-app";
import { ONCALL_AGENT_SYSTEM_PROMPT } from "../llm/system-prompt";
import { createInterface } from "node:readline";

const AWS_CLI_TOOL = {
  toolSpec: {
    name: "aws_cli",
    description: "Execute an AWS CLI command. Use this to inspect AWS resources like Lambda functions, CloudWatch logs/metrics, EC2 instances, DynamoDB tables, S3 buckets, etc. Results are auto-paginated. For counting resources, prefer adding a --query argument to extract just names or counts, e.g. --query 'Functions[].FunctionName' for lambda list-functions.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          service: { type: "string", description: "AWS service (e.g. lambda, logs, cloudwatch, ec2, s3, dynamodb)" },
          command: { type: "string", description: "CLI command (e.g. list-functions, describe-instances)" },
          args: { type: "array", items: { type: "string" }, description: "Additional CLI arguments" },
        },
        required: ["service", "command"],
      },
    },
  },
};

const SLACK_TOOL = {
  toolSpec: {
    name: "send_slack_message",
    description: "Send a message to the configured Slack channel. Use this to notify the team, share findings, or post incident updates.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message text to send to Slack" },
        },
        required: ["message"],
      },
    },
  },
};

const FILE_TOOL = {
  toolSpec: {
    name: "file_operation",
    description: "Read, write, edit, or list files on disk. Use 'edit' for targeted changes to existing files (safer than full rewrites). Paths are relative to the current working directory.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["read", "write", "edit", "list"], description: "read: read file, write: create/overwrite file, edit: replace a specific string in a file, list: list directory" },
          path: { type: "string", description: "File or directory path" },
          content: { type: "string", description: "File content (for write)" },
          old_string: { type: "string", description: "Exact string to find (for edit)" },
          new_string: { type: "string", description: "Replacement string (for edit)" },
        },
        required: ["operation", "path"],
      },
    },
  },
};

const GIT_TOOL = {
  toolSpec: {
    name: "git",
    description: "Run a git command in the current repo. Use this for branching, staging, committing, and pushing changes. Examples: 'checkout -b fix/cpu-spike', 'add src/file.ts', 'commit -m \"fix: handle timeout\"', 'push origin fix/cpu-spike'.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          args: { type: "array", items: { type: "string" }, description: "Git command arguments, e.g. ['checkout', '-b', 'fix/cpu-spike']" },
        },
        required: ["args"],
      },
    },
  },
};

const GITHUB_API_TOOL = {
  toolSpec: {
    name: "github_api",
    description: "Call the GitHub REST API. Auth is automatic. The owner/repo from config is injected — use {owner} and {repo} as placeholders in paths, e.g. /repos/{owner}/{repo}/issues. Supports pagination via query params.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["GET", "POST", "PATCH", "PUT"], description: "HTTP method" },
          path: { type: "string", description: "API path, e.g. /repos/{owner}/{repo}/pulls?state=open" },
          body: { type: "object", description: "Request body for POST/PATCH/PUT" },
        },
        required: ["method", "path"],
      },
    },
  },
};

export async function startChat(config: AppConfig): Promise<void> {
  const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
  const { fromIni } = await import("@aws-sdk/credential-providers");

  const awsProfile = await ensureTeleportSession(config);
  const region = config.llm.bedrockRegion ?? config.awsRegion;

  const bedrock = new BedrockRuntimeClient({
    region,
    ...(awsProfile && { credentials: fromIni({ profile: awsProfile }) }),
  });

  // Resolve GitHub token (with refresh support for App tokens)
  let githubToken: string | undefined;
  let githubTokenExpiresAt = 0;
  const isApp = Boolean(config.github.appId && config.github.appPrivateKey && config.github.appInstallationId);

  async function getGithubToken(): Promise<string | undefined> {
    if (!isApp) return config.github.token;
    if (githubToken && Date.now() < githubTokenExpiresAt - 60_000) return githubToken;
    const appToken = await getGitHubAppInstallationToken({
      appId: config.github.appId!,
      privateKey: config.github.appPrivateKey!,
      installationId: config.github.appInstallationId!,
    });
    githubToken = appToken.token;
    githubTokenExpiresAt = new Date(appToken.expiresAt).getTime();
    // Update remote URL so git push uses the App token
    const { $ } = await import("bun");
    const authUrl = `https://x-access-token:${githubToken}@github.com/${config.github.owner}/${config.github.repo}.git`;
    await $`git remote set-url origin ${authUrl}`.quiet();
    return githubToken;
  }

  let originalRemote: string | undefined;
  let gitEnv: Record<string, string> = {};
  if (isApp) {
    const { $ } = await import("bun");
    originalRemote = (await $`git remote get-url origin`.text()).trim();
    const botName = "oncall-agent[bot]";
    const botEmail = `${config.github.appId}+oncall-agent[bot]@users.noreply.github.com`;
    gitEnv = {
      GIT_AUTHOR_NAME: botName,
      GIT_AUTHOR_EMAIL: botEmail,
      GIT_COMMITTER_NAME: botName,
      GIT_COMMITTER_EMAIL: botEmail,
    };
    await getGithubToken(); // sets remote URL
  }

  const configContext = [
    `Repository: ${config.github.owner}/${config.github.repo} (branch: ${config.github.baseBranch})`,
    `AWS Region: ${config.awsRegion}`,
    `Teleport: proxy=${config.teleport.proxy ?? "not configured"} cluster=${config.teleport.cluster ?? "not configured"}`,
    `LLM: provider=${config.llm.provider} model=${config.llm.model}`,
  ].join("\n");

  const systemPrompt = `${ONCALL_AGENT_SYSTEM_PROMPT}\n\nCurrent agent configuration:\n${configContext}`;

  console.log("🦞 oncall-agent chat (type 'exit' to quit)\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => new Promise<string>((resolve) => rl.question("you> ", resolve));

  const messages: Message[] = [];

  while (true) {
    const input = (await prompt()).trim();
    if (!input) continue;
    if (input === "exit" || input === "quit") {
      if (originalRemote) {
        const { $ } = await import("bun");
        await $`git remote set-url origin ${originalRemote}`.quiet();
      }
      rl.close();
      break;
    }

    messages.push({ role: "user", content: [{ text: input }] });

    try {
      let response = await bedrock.send(new ConverseCommand({
        modelId: config.llm.model,
        system: [{ text: systemPrompt }],
        messages,
        toolConfig: { tools: [AWS_CLI_TOOL, SLACK_TOOL, GITHUB_API_TOOL, GIT_TOOL, FILE_TOOL] as Tool[] },
        inferenceConfig: { maxTokens: 2048, temperature: 0.2 },
      }));

      // Tool use loop
      while (response.stopReason === "tool_use") {
        const assistantContent = response.output?.message?.content ?? [];
        messages.push({ role: "assistant", content: assistantContent });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResults: any[] = [];
        for (const block of assistantContent) {
          if (block.toolUse) {
            const { toolUseId, name, input: toolInput } = block.toolUse;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ti = toolInput as Record<string, any> ?? {};
            if (name === "aws_cli") {
              console.log(`  ⚡ aws ${ti.service} ${ti.command} ${(ti.args ?? []).join(" ")}`);
              const result = await executeAwsCli(config, {
                service: ti.service,
                command: ti.command,
                args: ti.args ?? [],
                reason: "chat",
              });
              toolResults.push({
                toolResult: {
                  toolUseId,
                  content: [{ text: result.success ? result.stdout : `Error: ${result.stderr}` }],
                },
              });
            } else if (name === "send_slack_message") {
              console.log(`  💬 slack: ${ti.message?.slice(0, 80)}...`);
              const webhookUrl = Bun.env.SLACK_WEBHOOK_URL;
              let resultText: string;
              if (!webhookUrl) {
                resultText = "No SLACK_WEBHOOK_URL configured — message logged to stdout only";
                console.log(`  [slack-stdout] ${ti.message}`);
              } else {
                try {
                  await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: ti.message }),
                  });
                  resultText = "Message sent to Slack successfully";
                } catch (e: unknown) {
                  resultText = `Slack delivery failed: ${(e as Error).message}`;
                }
              }
              toolResults.push({
                toolResult: { toolUseId, content: [{ text: resultText }] },
              });
            } else if (name === "github_api") {
              const resolvedPath = (ti.path as string)
                .replace(/\{owner\}/g, config.github.owner)
                .replace(/\{repo\}/g, config.github.repo);
              console.log(`  🐙 github ${ti.method} ${resolvedPath}`);
              let ghResult: string;
              const token = await getGithubToken();
              if (!token) {
                ghResult = "No GitHub credentials configured";
              } else {
                try {
                  const res = await fetch(`https://api.github.com${resolvedPath}`, {
                    method: ti.method,
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/vnd.github+json",
                      "X-GitHub-Api-Version": "2022-11-28",
                      ...(ti.body && { "Content-Type": "application/json" }),
                    },
                    ...(ti.body && { body: JSON.stringify(ti.body) }),
                  });
                  console.log(`  🐙 github response: ${res.status} ${res.statusText} (${res.headers.get("content-length") ?? "unknown"} bytes)`);
                  ghResult = await res.text();
                } catch (e: unknown) {
                  ghResult = `GitHub API error: ${(e as Error).message}`;
                }
              }
              toolResults.push({
                toolResult: { toolUseId, content: [{ text: ghResult }] },
              });
            } else if (name === "git") {
              console.log(`  🔀 git ${(ti.args as string[]).join(" ")}`);
              let gitResult: string;
              try {
                const proc = Bun.spawn(["git", ...(ti.args as string[])], {
                  stdout: "pipe",
                  stderr: "pipe",
                  env: { ...process.env, ...gitEnv },
                });
                const [stdout, stderr, exitCode] = await Promise.all([
                  new Response(proc.stdout).text(),
                  new Response(proc.stderr).text(),
                  proc.exited,
                ]);
                gitResult = exitCode === 0 ? stdout || "OK" : `Error: ${stderr}`;
              } catch (e: unknown) {
                gitResult = `Git error: ${(e as Error).message}`;
              }
              toolResults.push({
                toolResult: { toolUseId, content: [{ text: gitResult }] },
              });
            } else if (name === "file_operation") {
              const { readFile, writeFile, readdir, mkdir } = await import("node:fs/promises");
              const { dirname } = await import("node:path");
              let fileResult: string;
              try {
                if (ti.operation === "read") {
                  console.log(`  📄 read ${ti.path}`);
                  fileResult = await readFile(ti.path, "utf-8");
                } else if (ti.operation === "write") {
                  console.log(`  ✏️  write ${ti.path}`);
                  await mkdir(dirname(ti.path), { recursive: true });
                  await writeFile(ti.path, ti.content, "utf-8");
                  fileResult = `Written ${ti.content.length} chars to ${ti.path}`;
                } else if (ti.operation === "edit") {
                  console.log(`  🔧 edit ${ti.path}`);
                  const existing = await readFile(ti.path, "utf-8");
                  if (!existing.includes(ti.old_string)) {
                    fileResult = `Error: old_string not found in ${ti.path}`;
                  } else if (existing.indexOf(ti.old_string) !== existing.lastIndexOf(ti.old_string)) {
                    fileResult = `Error: old_string matches multiple locations in ${ti.path} — be more specific`;
                  } else {
                    await writeFile(ti.path, existing.replace(ti.old_string, ti.new_string), "utf-8");
                    fileResult = `Edited ${ti.path} successfully`;
                  }
                } else if (ti.operation === "list") {
                  console.log(`  📁 list ${ti.path}`);
                  const entries = await readdir(ti.path, { withFileTypes: true });
                  fileResult = entries.map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`).join("\n");
                } else {
                  fileResult = `Unknown operation: ${ti.operation}`;
                }
              } catch (e: unknown) {
                fileResult = `File error: ${(e as Error).message}`;
              }
              toolResults.push({
                toolResult: { toolUseId, content: [{ text: fileResult }] },
              });
            }
          }
        }

        messages.push({ role: "user", content: toolResults });

        response = await bedrock.send(new ConverseCommand({
          modelId: config.llm.model,
          system: [{ text: systemPrompt }],
          messages,
          toolConfig: { tools: [AWS_CLI_TOOL, SLACK_TOOL, GITHUB_API_TOOL, GIT_TOOL, FILE_TOOL] as Tool[] },
          inferenceConfig: { maxTokens: 2048, temperature: 0.2 },
        }));
      }

      // Extract final text
      const finalContent = response.output?.message?.content ?? [];
      messages.push({ role: "assistant", content: finalContent });

      const text = finalContent.map((b) => b.text).filter(Boolean).join("\n");
      console.log(`\nagent> ${text}\n`);
    } catch (e: unknown) {
      console.error(`\nerror: ${(e as Error).message}\n`);
    }
  }
}
