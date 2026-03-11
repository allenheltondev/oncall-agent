import { loadConfig } from "./config/env";
import { loadIdentityMap } from "./config/identity-map";
import { startAgent } from "./agent/runtime";
import { readFile, writeFile } from "node:fs/promises";
import { runSetupWizard } from "./setup/wizard";

interface CliOptions {
  configPath?: string;
  envFile?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  nonInteractive?: boolean;
  profile?: string;
  momentoApiKey?: string;
  momentoCacheName?: string;
  momentoTopicName?: string;
  teleportProxy?: string;
  teleportCluster?: string;
  teleportAudience?: string;
  teleportMockIdentity?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBaseBranch?: string;
  slackToken?: string;
  slackChannel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
  awsAccountId?: string;
}

const DEFAULT_ENV_FILE = ".env";

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--non-interactive") {
      options.nonInteractive = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value) continue;

    if (token === "--config") options.configPath = value;
    else if (token === "--env-file") options.envFile = value;
    else if (token === "--api-key") options.apiKey = value;
    else if (token === "--model") options.model = value;
    else if (token === "--base-url") options.baseUrl = value;
    else if (token === "--profile") options.profile = value;
    else if (token === "--momento-api-key") options.momentoApiKey = value;
    else if (token === "--momento-cache") options.momentoCacheName = value;
    else if (token === "--momento-topic") options.momentoTopicName = value;
    else if (token === "--teleport-proxy") options.teleportProxy = value;
    else if (token === "--teleport-cluster") options.teleportCluster = value;
    else if (token === "--teleport-audience") options.teleportAudience = value;
    else if (token === "--teleport-mock") options.teleportMockIdentity = value;
    else if (token === "--github-owner") options.githubOwner = value;
    else if (token === "--github-repo") options.githubRepo = value;
    else if (token === "--github-base-branch") options.githubBaseBranch = value;
    else if (token === "--slack-token") options.slackToken = value;
    else if (token === "--slack-channel") options.slackChannel = value;
    else if (token === "--openai-api-key") options.openaiApiKey = value;
    else if (token === "--openai-model") options.openaiModel = value;
    else if (token === "--openai-base-url") options.openaiBaseUrl = value;
    else if (token === "--aws-account-id") options.awsAccountId = value;
    else continue;

    i += 1;
  }
  return options;
}

function usage(): string {
  return [
    "oncall-agent CLI",
    "",
    "Commands:",
    "  oncall-agent config validate [--config <path>]",
    "  oncall-agent config llm show [--env-file <path>]",
    "  oncall-agent config llm set [--api-key <key>] [--model <model>] [--base-url <url>] [--env-file <path>]",
    "  oncall-agent setup [--non-interactive ...flags]",
    "  oncall-agent start [--config <path>]",
  ].join("\n");
}

function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

async function readEnvFile(path: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(path, "utf-8");
    return parseDotEnv(content);
  } catch {
    return {};
  }
}

async function writeEnvFile(path: string, values: Record<string, string>): Promise<void> {
  const lines = Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  await writeFile(path, `${lines.join("\n")}\n`, "utf-8");
}

function maskSecret(secret?: string): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export async function runCli(argv = Bun.argv.slice(2)): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  if (!command) {
    console.log(usage());
    return 0;
  }

  if (command === "config") {
    if (subcommand === "validate") {
      const opts = parseOptions(rest);
      const map = await loadIdentityMap(opts.configPath);
      console.log(
        JSON.stringify(
          {
            ok: true,
            schemaVersion: map.schemaVersion,
            environments: map.environments.map((env) => env.name),
            configPath: opts.configPath ?? "config/identity-map.v1.json",
          },
          null,
          2,
        ),
      );
      return 0;
    }

    if (subcommand === "llm") {
      const [action, ...llmRest] = rest;
      const opts = parseOptions(llmRest);
      const envPath = opts.envFile ?? DEFAULT_ENV_FILE;

      if (action === "show") {
        const env = await readEnvFile(envPath);
        console.log(
          JSON.stringify(
            {
              provider: "codex",
              envFile: envPath,
              model: env.OPENAI_MODEL ?? Bun.env.OPENAI_MODEL ?? null,
              baseUrl: env.OPENAI_BASE_URL ?? Bun.env.OPENAI_BASE_URL ?? null,
              apiKey: maskSecret(env.OPENAI_API_KEY ?? Bun.env.OPENAI_API_KEY),
            },
            null,
            2,
          ),
        );
        return 0;
      }

      if (action === "set") {
        if (!opts.apiKey && !opts.model && !opts.baseUrl) {
          console.error("Provide at least one of: --api-key, --model, --base-url");
          return 1;
        }

        const env = await readEnvFile(envPath);
        if (opts.apiKey) env.OPENAI_API_KEY = opts.apiKey;
        if (opts.model) env.OPENAI_MODEL = opts.model;
        if (opts.baseUrl) env.OPENAI_BASE_URL = opts.baseUrl;

        await writeEnvFile(envPath, env);
        console.log(
          JSON.stringify(
            {
              ok: true,
              envFile: envPath,
              written: {
                OPENAI_API_KEY: Boolean(opts.apiKey),
                OPENAI_MODEL: opts.model ?? null,
                OPENAI_BASE_URL: opts.baseUrl ?? null,
              },
            },
            null,
            2,
          ),
        );
        return 0;
      }
    }

    console.error("Unknown config subcommand");
    console.log(usage());
    return 1;
  }

  if (command === "setup") {
    const opts = parseOptions([subcommand, ...rest].filter(Boolean) as string[]);
    await runSetupWizard({
      nonInteractive: opts.nonInteractive,
      envFile: opts.envFile,
      identityMapPath: opts.configPath,
      profile: opts.profile,
      momentoApiKey: opts.momentoApiKey,
      momentoCacheName: opts.momentoCacheName,
      momentoTopicName: opts.momentoTopicName,
      teleportProxy: opts.teleportProxy,
      teleportCluster: opts.teleportCluster,
      teleportAudience: opts.teleportAudience,
      teleportMockIdentity: opts.teleportMockIdentity,
      githubOwner: opts.githubOwner,
      githubRepo: opts.githubRepo,
      githubBaseBranch: opts.githubBaseBranch,
      slackToken: opts.slackToken,
      slackChannel: opts.slackChannel,
      openaiApiKey: opts.openaiApiKey,
      openaiModel: opts.openaiModel,
      openaiBaseUrl: opts.openaiBaseUrl,
      awsAccountId: opts.awsAccountId,
    });
    return 0;
  }

  if (command === "start") {
    const opts = parseOptions([subcommand, ...rest].filter(Boolean) as string[]);
    await loadIdentityMap(opts.configPath);
    const config = loadConfig();
    await startAgent(config);
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  console.log(usage());
  return 1;
}

if (import.meta.main) {
  const code = await runCli();
  process.exit(code);
}
