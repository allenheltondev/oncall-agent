import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { maskSecret } from "../security/secrets";

export type SetupModule = "momento" | "teleport" | "github" | "slack" | "llm" | "identity";

const ALL_MODULES: SetupModule[] = ["momento", "teleport", "github", "slack", "llm", "identity"];

export interface SetupOptions {
  nonInteractive?: boolean;
  envFile?: string;
  identityMapPath?: string;
  modules?: string;
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

function parseDotEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

async function readEnv(path: string): Promise<Record<string, string>> {
  try {
    return parseDotEnv(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
}

async function writeEnv(path: string, values: Record<string, string>): Promise<void> {
  const lines = Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  await writeFile(path, `${lines.join("\n")}\n`, "utf-8");
}

async function promptIfNeeded(
  rl: ReturnType<typeof createInterface> | null,
  label: string,
  value: string | undefined,
  fallback = "",
): Promise<string> {
  if (value !== undefined) return value;
  if (!rl) return fallback;
  const answer = await rl.question(`${label}${fallback ? ` [${fallback}]` : ""}: `);
  return answer.trim() || fallback;
}

function parseModuleList(modules?: string): SetupModule[] {
  if (!modules?.trim()) return [...ALL_MODULES];
  const requested = modules
    .split(",")
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);

  const valid = requested.filter((m): m is SetupModule => ALL_MODULES.includes(m as SetupModule));
  return valid.length > 0 ? valid : [...ALL_MODULES];
}

export async function runSetupWizard(opts: SetupOptions): Promise<void> {
  const envFile = opts.envFile ?? ".env";
  const identityMapPath = opts.identityMapPath ?? "config/identity-map.v1.json";
  const nonInteractive = opts.nonInteractive ?? false;
  const rl = nonInteractive ? null : createInterface({ input, output });

  try {
    const current = await readEnv(envFile);

    let moduleInput = opts.modules;
    if (!moduleInput && rl) {
      const answer = await rl.question(
        `Modules to configure (comma-separated: ${ALL_MODULES.join(", ")}) [all]: `,
      );
      moduleInput = answer.trim() || undefined;
    }
    const selected = new Set(parseModuleList(moduleInput));

    const profile = await promptIfNeeded(rl, "Profile", opts.profile, "dev");

    let momentoApiKey = current.MOMENTO_API_KEY ?? "";
    let momentoCacheName = current.MOMENTO_CACHE_NAME ?? "oncall-agent";
    let momentoTopicName = current.MOMENTO_TOPIC_NAME ?? "incidents";
    if (selected.has("momento")) {
      momentoApiKey = await promptIfNeeded(rl, "Momento API key", opts.momentoApiKey, momentoApiKey);
      momentoCacheName = await promptIfNeeded(rl, "Momento cache name", opts.momentoCacheName, momentoCacheName);
      momentoTopicName = await promptIfNeeded(rl, "Momento topic name", opts.momentoTopicName, momentoTopicName);
    }

    let teleportProxy = current.TELEPORT_PROXY ?? "";
    let teleportCluster = current.TELEPORT_CLUSTER ?? "main";
    let teleportAudience = current.TELEPORT_AUDIENCE ?? "oncall-agent";
    let teleportMockIdentity = current.TELEPORT_MOCK_IDENTITY ?? "true";
    if (selected.has("teleport") || selected.has("identity")) {
      teleportProxy = await promptIfNeeded(rl, "Teleport proxy", opts.teleportProxy, teleportProxy);
      teleportCluster = await promptIfNeeded(rl, "Teleport cluster", opts.teleportCluster, teleportCluster);
      teleportAudience = await promptIfNeeded(rl, "Teleport audience", opts.teleportAudience, teleportAudience);
      teleportMockIdentity = await promptIfNeeded(
        rl,
        "Teleport mock identity (true/false)",
        opts.teleportMockIdentity,
        teleportMockIdentity,
      );
    }

    let githubOwner = current.GITHUB_OWNER ?? "allenheltondev";
    let githubRepo = current.GITHUB_REPO ?? "oncall-agent";
    let githubBaseBranch = "main";
    if (selected.has("github") || selected.has("identity")) {
      githubOwner = await promptIfNeeded(rl, "GitHub owner", opts.githubOwner, githubOwner);
      githubRepo = await promptIfNeeded(rl, "GitHub repo", opts.githubRepo, githubRepo);
      githubBaseBranch = await promptIfNeeded(rl, "GitHub base branch", opts.githubBaseBranch, githubBaseBranch);
    }

    let slackToken = current.SLACK_TOKEN ?? "";
    let slackChannel = current.SLACK_CHANNEL ?? "";
    if (selected.has("slack")) {
      slackToken = await promptIfNeeded(rl, "Slack token/webhook", opts.slackToken, slackToken);
      slackChannel = await promptIfNeeded(rl, "Slack channel", opts.slackChannel, slackChannel);
    }

    let openaiApiKey = current.OPENAI_API_KEY ?? "";
    let openaiModel = current.OPENAI_MODEL ?? "gpt-5.3-codex";
    let openaiBaseUrl = current.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    if (selected.has("llm")) {
      openaiApiKey = await promptIfNeeded(rl, "OpenAI/Codex API key", opts.openaiApiKey, openaiApiKey);
      openaiModel = await promptIfNeeded(rl, "OpenAI model", opts.openaiModel, openaiModel);
      openaiBaseUrl = await promptIfNeeded(rl, "OpenAI base URL", opts.openaiBaseUrl, openaiBaseUrl);
    }

    const awsAccountId = selected.has("identity")
      ? await promptIfNeeded(rl, "AWS account id", opts.awsAccountId, "123456789012")
      : opts.awsAccountId ?? "123456789012";

    const envOut = { ...current };
    if (selected.has("momento")) {
      envOut.MOMENTO_API_KEY = momentoApiKey;
      envOut.MOMENTO_CACHE_NAME = momentoCacheName;
      envOut.MOMENTO_TOPIC_NAME = momentoTopicName;
    }
    if (selected.has("teleport") || selected.has("identity")) {
      envOut.TELEPORT_PROXY = teleportProxy;
      envOut.TELEPORT_CLUSTER = teleportCluster;
      envOut.TELEPORT_AUDIENCE = teleportAudience;
      envOut.TELEPORT_MOCK_IDENTITY = teleportMockIdentity;
    }
    if (selected.has("github") || selected.has("identity")) {
      envOut.GITHUB_OWNER = githubOwner;
      envOut.GITHUB_REPO = githubRepo;
    }
    if (selected.has("slack")) {
      envOut.SLACK_TOKEN = slackToken;
      envOut.SLACK_CHANNEL = slackChannel;
    }
    if (selected.has("llm")) {
      envOut.OPENAI_API_KEY = openaiApiKey;
      envOut.OPENAI_MODEL = openaiModel;
      envOut.OPENAI_BASE_URL = openaiBaseUrl;
    }

    await writeEnv(envFile, envOut);

    if (selected.has("identity")) {
      const identityMap = {
        schemaVersion: "identity-map.v1",
        environments: [
          {
            name: profile,
            aws: {
              accountId: awsAccountId,
              allowedRoleArns: [`arn:aws:iam::${awsAccountId}:role/oncall-agent-${profile}-read`],
            },
            github: {
              owner: githubOwner,
              repo: githubRepo,
              baseBranch: githubBaseBranch,
            },
            teleport: {
              proxy: teleportProxy,
              cluster: teleportCluster,
              audience: teleportAudience,
            },
          },
        ],
      };

      await mkdir(dirname(identityMapPath), { recursive: true });
      await writeFile(identityMapPath, JSON.stringify(identityMap, null, 2), "utf-8");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          envFile,
          identityMapPath: selected.has("identity") ? identityMapPath : null,
          selectedModules: [...selected],
          profile,
          github: `${githubOwner}/${githubRepo}`,
          momentoTopicName,
          teleportCluster,
          slackChannel: slackChannel || null,
          openaiModel,
          openaiApiKey: maskSecret(openaiApiKey) ?? "(empty)",
        },
        null,
        2,
      ),
    );
  } finally {
    rl?.close();
  }
}
