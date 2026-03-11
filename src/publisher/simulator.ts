import { readFile } from "node:fs/promises";
import { loadConfig } from "../config/env";
import { parseIncidentSignal } from "../types/incident";

export interface PublishOptions {
  dryRun?: boolean;
}

export async function publishFixture(
  fixturePath: string,
  options: PublishOptions = {},
): Promise<void> {
  const config = loadConfig();
  const raw = await readFile(fixturePath, "utf-8");
  const parsed = parseIncidentSignal(JSON.parse(raw));

  const dryRun = options.dryRun ?? !config.momento.apiKey;
  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          action: "incident.publish",
          transport: "momento-topics",
          dryRun: true,
          topic: config.momento.topicName,
          cache: config.momento.cacheName,
          incident: parsed,
        },
        null,
        2,
      ),
    );
    return;
  }

  const sdk = (await import("@gomomento/sdk")) as any;
  const topicClient = new sdk.TopicClient({
    configuration: sdk.Configurations.Laptop.latest(),
    credentialProvider: sdk.CredentialProvider.fromString(config.momento.apiKey),
  });

  await topicClient.publish(
    config.momento.cacheName,
    config.momento.topicName,
    JSON.stringify(parsed),
  );

  console.log(
    JSON.stringify(
      {
        action: "incident.publish",
        transport: "momento-topics",
        dryRun: false,
        topic: config.momento.topicName,
        cache: config.momento.cacheName,
        incidentId: parsed.incidentId,
      },
      null,
      2,
    ),
  );
}

function parseCliArgs(argv: string[]): { fixture?: string; dryRun?: boolean } {
  const args = [...argv];
  const result: { fixture?: string; dryRun?: boolean } = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--dry-run") result.dryRun = true;
    else if (token === "--live") result.dryRun = false;
    else if (!result.fixture) result.fixture = token;
  }

  return result;
}

if (import.meta.main) {
  const { fixture, dryRun } = parseCliArgs(Bun.argv.slice(2));
  if (!fixture) {
    console.error("Usage: bun run publish:simulate <fixture.json> [--dry-run|--live]");
    process.exit(1);
  }

  await publishFixture(fixture, { dryRun });
}
