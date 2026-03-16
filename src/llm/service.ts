import type { AppConfig } from "../config/env";
import type { LlmClient } from "./types";
import { LlmOrchestrator } from "./orchestrator";
import { renderPrompt } from "./prompt-templates";
import { CodexClient } from "./providers/codex-client";
import { BedrockClient } from "./providers/bedrock-client";
import { ensureTeleportSession } from "../identity/teleport-session";

async function createClient(config: AppConfig): Promise<LlmClient | null> {
  if (config.llm.provider === "bedrock") {
    const awsProfile = await ensureTeleportSession(config);
    return new BedrockClient({
      region: config.llm.bedrockRegion ?? config.awsRegion,
      modelId: config.llm.model,
      awsProfile: awsProfile ?? undefined,
    });
  }

  if (!config.llm.apiKey) return null;
  return new CodexClient({
    apiKey: config.llm.apiKey,
    model: config.llm.model,
    baseUrl: config.llm.baseUrl,
  });
}

export async function createLlmOrchestrator(config: AppConfig): Promise<LlmOrchestrator | null> {
  const client = await createClient(config);
  if (!client) return null;

  return new LlmOrchestrator({
    client,
    routing: {
      defaultModel: config.llm.model,
      byTask: {
        status_summary: config.llm.model,
        remediation_text: config.llm.model,
      },
    },
    retries: 1,
    timeoutMs: 20_000,
  });
}

export async function maybeGenerateStatusSummary(
  orchestrator: LlmOrchestrator | null,
  state: Record<string, unknown>,
): Promise<string | null> {
  if (!orchestrator) return null;

  const prompt = renderPrompt("status_summary", {
    state: JSON.stringify(state, null, 2),
  });

  const response = await orchestrator.run("status_summary", prompt, 300);
  return response.text;
}
