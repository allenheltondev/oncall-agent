import type { LlmClient, LlmRequest, LlmResponse, LlmRoutingPolicy, LlmTaskType } from "./types";

export interface LlmOrchestratorOptions {
  client: LlmClient;
  routing: LlmRoutingPolicy;
  retries?: number;
  timeoutMs?: number;
}

export class LlmOrchestrator {
  private readonly retries: number;
  private readonly timeoutMs: number;

  constructor(private readonly options: LlmOrchestratorOptions) {
    this.retries = options.retries ?? 1;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async run(taskType: LlmTaskType, prompt: string, maxTokens = 800): Promise<LlmResponse> {
    const model = this.options.routing.byTask?.[taskType] ?? this.options.routing.defaultModel;

    const request: LlmRequest = {
      taskType,
      prompt,
      maxTokens,
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const start = Date.now();
        const response = await this.withTimeout(this.options.client.complete(request));
        const latencyMs = Date.now() - start;

        console.log(
          JSON.stringify({
            event: "llm.call",
            taskType,
            model,
            provider: response.provider,
            latencyMs,
            usage: response.usage,
          }),
        );

        return { ...response, model: response.model || model, latencyMs };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `LLM orchestration failed for task=${taskType}: ${
        lastError instanceof Error ? lastError.message : "unknown error"
      }`,
    );
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`LLM call timed out after ${this.timeoutMs}ms`)), this.timeoutMs),
      ),
    ]);
  }
}
