import { loadConfig } from "./config/env";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export async function runDoctor(): Promise<{ ok: boolean; checks: DoctorCheck[] }> {
  const config = await loadConfig();
  const checks: DoctorCheck[] = [];

  checks.push({
    name: "momento.config",
    ok: Boolean(config.momento.apiKey && config.momento.cacheName && config.momento.topicName),
    detail: config.momento.apiKey
      ? `configured cache=${config.momento.cacheName} topic=${config.momento.topicName}`
      : "MOMENTO_API_KEY missing",
  });

  checks.push({
    name: "teleport.config",
    ok: Boolean(config.teleport.proxy && config.teleport.cluster),
    detail: config.teleport.proxy
      ? `configured proxy=${config.teleport.proxy} cluster=${config.teleport.cluster}`
      : "TELEPORT_PROXY/TELEPORT_CLUSTER missing",
  });

  checks.push({
    name: "github.config",
    ok: Boolean(config.github.owner && config.github.repo),
    detail: `${config.github.owner}/${config.github.repo}`,
  });

  checks.push({
    name: "slack.config",
    ok: Boolean(Bun.env.SLACK_WEBHOOK_URL || Bun.env.SLACK_CHANNEL),
    detail: Bun.env.SLACK_WEBHOOK_URL
      ? "SLACK_WEBHOOK_URL configured"
      : Bun.env.SLACK_CHANNEL
        ? `SLACK_CHANNEL configured (${Bun.env.SLACK_CHANNEL})`
        : "Slack env missing",
  });

  checks.push({
    name: "llm.config",
    ok: Boolean(config.llm.apiKey && config.llm.model),
    detail: config.llm.apiKey ? `provider=${config.llm.provider} model=${config.llm.model}` : "OPENAI_API_KEY missing",
  });

  return { ok: checks.every((c) => c.ok), checks };
}
