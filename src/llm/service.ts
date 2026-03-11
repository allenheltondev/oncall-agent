import type { AppConfig } from "../config/env";
import { LlmOrchestrator } from "./orchestrator";
import { renderPrompt } from "./prompt-templates";
import { CodexClient } from "./providers/codex-client";

export function createLlmOrchestrator(config: AppConfig): LlmOrchestrator | null {
  if (!config.llm.apiKey) {
    return null;
  }

  const client = new CodexClient({
    apiKey: config.llm.apiKey,
    model: config.llm.model,
    baseUrl: config.llm.baseUrl,
  });

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
