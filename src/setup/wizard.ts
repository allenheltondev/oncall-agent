import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface SetupOptions {
  nonInteractive?: boolean;
  envFile?: string;
  identityMapPath?: string;
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

export async function runSetupWizard(opts: SetupOptions): Promise<void> {
  const envFile = opts.envFile ?? ".env";
  const identityMapPath = opts.identityMapPath ?? "config/identity-map.v1.json";
  const nonInteractive = opts.nonInteractive ?? false;
  const rl = nonInteractive ? null : createInterface({ input, output });

  try {
    const current = await readEnv(envFile);

    const profile = await promptIfNeeded(rl, "Profile", opts.profile, "dev");
    const momentoApiKey = await promptIfNeeded(rl, "Momento API key", opts.momentoApiKey, current.MOMENTO_API_KEY ?? "");
    const momentoCacheName = await promptIfNeeded(rl, "Momento cache name", opts.momentoCacheName, current.MOMENTO_CACHE_NAME ?? "oncall-agent");
    const momentoTopicName = await promptIfNeeded(rl, "Momento topic name", opts.momentoTopicName, current.MOMENTO_TOPIC_NAME ?? "incidents");

    const teleportProxy = await promptIfNeeded(rl, "Teleport proxy", opts.teleportProxy, current.TELEPORT_PROXY ?? "");
    const teleportCluster = await promptIfNeeded(rl, "Teleport cluster", opts.teleportCluster, current.TELEPORT_CLUSTER ?? "main");
    const teleportAudience = await promptIfNeeded(rl, "Teleport audience", opts.teleportAudience, current.TELEPORT_AUDIENCE ?? "oncall-agent");
    const teleportMockIdentity = await promptIfNeeded(rl, "Teleport mock identity (true/false)", opts.teleportMockIdentity, current.TELEPORT_MOCK_IDENTITY ?? "true");

    const githubOwner = await promptIfNeeded(rl, "GitHub owner", opts.githubOwner, current.GITHUB_OWNER ?? "allenheltondev");
    const githubRepo = await promptIfNeeded(rl, "GitHub repo", opts.githubRepo, current.GITHUB_REPO ?? "oncall-agent");
    const githubBaseBranch = await promptIfNeeded(rl, "GitHub base branch", opts.githubBaseBranch, "main");

    const slackToken = await promptIfNeeded(rl, "Slack token/webhook", opts.slackToken, current.SLACK_TOKEN ?? "");
    const slackChannel = await promptIfNeeded(rl, "Slack channel", opts.slackChannel, current.SLACK_CHANNEL ?? "");

    const openaiApiKey = await promptIfNeeded(rl, "OpenAI/Codex API key", opts.openaiApiKey, current.OPENAI_API_KEY ?? "");
    const openaiModel = await promptIfNeeded(rl, "OpenAI model", opts.openaiModel, current.OPENAI_MODEL ?? "gpt-5.3-codex");
    const openaiBaseUrl = await promptIfNeeded(rl, "OpenAI base URL", opts.openaiBaseUrl, current.OPENAI_BASE_URL ?? "https://api.openai.com/v1");

    const awsAccountId = await promptIfNeeded(rl, "AWS account id", opts.awsAccountId, "123456789012");

    const envOut = {
      ...current,
      MOMENTO_API_KEY: momentoApiKey,
      MOMENTO_CACHE_NAME: momentoCacheName,
      MOMENTO_TOPIC_NAME: momentoTopicName,
      TELEPORT_PROXY: teleportProxy,
      TELEPORT_CLUSTER: teleportCluster,
      TELEPORT_AUDIENCE: teleportAudience,
      TELEPORT_MOCK_IDENTITY: teleportMockIdentity,
      GITHUB_OWNER: githubOwner,
      GITHUB_REPO: githubRepo,
      SLACK_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
      OPENAI_API_KEY: openaiApiKey,
      OPENAI_MODEL: openaiModel,
      OPENAI_BASE_URL: openaiBaseUrl,
    };

    await writeEnv(envFile, envOut);

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

    const mask = (v: string) => (v ? `${v.slice(0, 4)}...${v.slice(-4)}` : "(empty)");
    console.log(
      JSON.stringify(
        {
          ok: true,
          envFile,
          identityMapPath,
          profile,
          github: `${githubOwner}/${githubRepo}`,
          momentoTopicName,
          teleportCluster,
          slackChannel: slackChannel || null,
          openaiModel,
          openaiApiKey: mask(openaiApiKey),
        },
        null,
        2,
      ),
    );
  } finally {
    rl?.close();
  }
}
