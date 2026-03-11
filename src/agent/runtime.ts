import type { AppConfig } from "../config/env";

export async function startAgent(config: AppConfig): Promise<void> {
  console.log("🦞 oncall-agent booting (Bun + TypeScript)");
  console.log(`mode=local-persistent runtime=bun env=${config.nodeEnv}`);
  console.log(
    `targets: momentoTopic=${config.momento.topicName} github=${config.github.owner}/${config.github.repo}`,
  );
}
