export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  logLevel: "debug" | "info" | "warn" | "error";
  awsRegion: string;
  momento: {
    apiKey?: string;
    cacheName: string;
    topicName: string;
  };
  teleport: {
    proxy?: string;
    cluster?: string;
    audience: string;
    mockIdentity: boolean;
    issuerCommandAws?: string;
    issuerCommandGithub?: string;
    awsRole?: string;
    awsAppName?: string;  };
  github: {
    owner: string;
    repo: string;
    baseBranch: string;
    appId?: string;
    appPrivateKey?: string;
    appInstallationId?: string;
    token?: string;
  };
  llm: {
    provider: "codex";
    apiKey?: string;
    model: string;
    baseUrl?: string;
  };
  storage: {
    mode: "json" | "sqlite";
    sqlitePath: string;
  };
}

const NODE_ENVS = new Set(["development", "test", "production"]);
const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function env(name: string, fallback?: string): string | undefined {
  const value = Bun.env[name] ?? fallback;
  return value?.trim() ? value.trim() : undefined;
}

function envBool(name: string, fallback = false): boolean {
  const value = env(name);
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

async function readKeyFile(path?: string): Promise<string | undefined> {
  if (!path) return undefined;
  const { readFile } = await import("node:fs/promises");
  return (await readFile(path, "utf-8")).trim();
}

export async function loadConfig(): Promise<AppConfig> {
  const nodeEnvRaw = env("NODE_ENV", "development")!;
  const logLevelRaw = env("LOG_LEVEL", "info")!;

  if (!NODE_ENVS.has(nodeEnvRaw)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnvRaw}`);
  }

  if (!LOG_LEVELS.has(logLevelRaw)) {
    throw new Error(`Invalid LOG_LEVEL: ${logLevelRaw}`);
  }

  return {
    nodeEnv: nodeEnvRaw as AppConfig["nodeEnv"],
    logLevel: logLevelRaw as AppConfig["logLevel"],
    awsRegion: env("AWS_REGION", "us-east-1")!,
    momento: {
      apiKey: env("MOMENTO_API_KEY"),
      cacheName: env("MOMENTO_CACHE_NAME", "oncall-agent")!,
      topicName: env("MOMENTO_TOPIC_NAME", "incidents")!,
    },
    teleport: {
      proxy: env("TELEPORT_PROXY"),
      cluster: env("TELEPORT_CLUSTER"),
      audience: env("TELEPORT_AUDIENCE", "oncall-agent")!,
      mockIdentity: envBool("TELEPORT_MOCK_IDENTITY", false),
      issuerCommandAws: env("TELEPORT_ISSUER_COMMAND_AWS"),
      awsRole: env("TELEPORT_AWS_ROLE"),
      awsAppName: env("TELEPORT_AWS_APP_NAME"),      issuerCommandGithub: env("TELEPORT_ISSUER_COMMAND_GITHUB"),
    },
    github: {
      owner: env("GITHUB_OWNER", "allenheltondev")!,
      repo: env("GITHUB_REPO", "oncall-agent")!,
      baseBranch: env("GITHUB_BASE_BRANCH", "main")!,
      appId: env("GITHUB_APP_ID"),
      appPrivateKey: env("GITHUB_APP_PRIVATE_KEY") ?? await readKeyFile(env("GITHUB_APP_PRIVATE_KEY_FILE")),
      appInstallationId: env("GITHUB_APP_INSTALLATION_ID"),
      token: env("GITHUB_TOKEN"),
    },
    llm: {
      provider: "codex",
      apiKey: env("OPENAI_API_KEY"),
      model: env("OPENAI_MODEL", "gpt-5.3-codex")!,
      baseUrl: env("OPENAI_BASE_URL"),
    },
    storage: {
      mode: (env("STORAGE_MODE", "json") as "json" | "sqlite") ?? "json",
      sqlitePath: env("SQLITE_PATH", "data/oncall-agent.db")!,
    },
  };
}
