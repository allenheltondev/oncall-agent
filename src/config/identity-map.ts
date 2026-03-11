import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface IdentityMapEnvironment {
  name: string;
  aws: {
    accountId: string;
    allowedRoleArns: string[];
  };
  github: {
    owner: string;
    repo: string;
    baseBranch: string;
  };
  teleport: {
    proxy: string;
    cluster: string;
    audience: string;
  };
}

export interface IdentityMapV1 {
  schemaVersion: "identity-map.v1";
  environments: IdentityMapEnvironment[];
}

const DEFAULT_PATH = join(process.cwd(), "config", "identity-map.v1.json");

export async function loadIdentityMap(path = DEFAULT_PATH): Promise<IdentityMapV1> {
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as Partial<IdentityMapV1>;

  if (parsed.schemaVersion !== "identity-map.v1") {
    throw new Error("Invalid identity map schemaVersion");
  }

  if (!Array.isArray(parsed.environments) || parsed.environments.length === 0) {
    throw new Error("Identity map must include at least one environment mapping");
  }

  for (const env of parsed.environments) {
    if (!env.name || !env.aws?.accountId || !env.github?.owner || !env.github?.repo) {
      throw new Error(`Invalid identity map environment entry: ${JSON.stringify(env)}`);
    }
  }

  return parsed as IdentityMapV1;
}

export function resolveEnvironment(
  map: IdentityMapV1,
  environmentName: string,
): IdentityMapEnvironment {
  const entry = map.environments.find((env) => env.name === environmentName);
  if (!entry) {
    throw new Error(`No identity mapping found for environment: ${environmentName}`);
  }
  return entry;
}
