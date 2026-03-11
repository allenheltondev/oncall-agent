import { readFile } from "node:fs/promises";
import { loadConfig } from "../config/env";
import { parseIncidentSignal } from "../types/incident";

export async function publishFixture(fixturePath: string): Promise<void> {
  const config = loadConfig();
  const raw = await readFile(fixturePath, "utf-8");
  const parsed = parseIncidentSignal(JSON.parse(raw));

  // Placeholder transport: wire Momento SDK in a follow-up issue.
  console.log(
    JSON.stringify(
      {
        action: "incident.publish",
        transport: "momento-topics",
        dryRun: !config.momento.apiKey,
        topic: config.momento.topicName,
        cache: config.momento.cacheName,
        incident: parsed,
      },
      null,
      2,
    ),
  );
}

const fixtureArg = Bun.argv[2];
if (import.meta.main) {
  if (!fixtureArg) {
    console.error("Usage: bun run publish:simulate <fixture.json>");
    process.exit(1);
  }

  await publishFixture(fixtureArg);
}
