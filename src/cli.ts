import { loadConfig } from "./config/env";
import { loadIdentityMap } from "./config/identity-map";
import { startAgent } from "./agent/runtime";
import { readFile, writeFile } from "node:fs/promises";

interface CliOptions {
  configPath?: string;
  envFile?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const DEFAULT_ENV_FILE = ".env";

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const value = argv[i + 1];
    if (!value) continue;

    if (token === "--config") {
      options.configPath = value;
      i += 1;
    } else if (token === "--env-file") {
      options.envFile = value;
      i += 1;
    } else if (token === "--api-key") {
      options.apiKey = value;
      i += 1;
    } else if (token === "--model") {
      options.model = value;
      i += 1;
    } else if (token === "--base-url") {
      options.baseUrl = value;
      i += 1;
    }
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
