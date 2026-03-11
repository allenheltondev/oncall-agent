import type { LlmClient, LlmRequest, LlmResponse } from "../types";

export interface CodexClientOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class CodexClient implements LlmClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: CodexClientOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.model,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 800,
          messages: [
            {
              role: "system",
              content: "You are an incident-response coding assistant. Be concise and actionable.",
            },
            {
              role: "user",
              content: request.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Codex API error: ${response.status} ${text}`);
      }

      const json = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("Codex API returned empty completion text");
      }

      return {
        text,
        provider: "codex",
        model: json.model ?? this.options.model,
        latencyMs: 0,
        usage: {
          inputTokens: json.usage?.prompt_tokens,
          outputTokens: json.usage?.completion_tokens,
        },
      };
    } finally {
      clearTimeout(id);
    }
  }
}
