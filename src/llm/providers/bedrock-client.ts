import type { LlmClient, LlmRequest, LlmResponse } from "../types";
import { ONCALL_AGENT_SYSTEM_PROMPT } from "../system-prompt";

export interface BedrockClientOptions {
  region: string;
  modelId: string;
  awsProfile?: string;
  timeoutMs?: number;
}

export class BedrockClient implements LlmClient {
  constructor(private readonly options: BedrockClientOptions) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const { BedrockRuntimeClient, ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
    const { fromIni } = await import("@aws-sdk/credential-providers");

    const client = new BedrockRuntimeClient({
      region: this.options.region,
      ...(this.options.awsProfile && { credentials: fromIni({ profile: this.options.awsProfile }) }),
    });

    const command = new ConverseCommand({
      modelId: this.options.modelId,
      system: [{ text: ONCALL_AGENT_SYSTEM_PROMPT }],
      messages: [
        { role: "user", content: [{ text: request.prompt }] },
      ],
      inferenceConfig: {
        maxTokens: request.maxTokens ?? 800,
        temperature: request.temperature ?? 0.2,
      },
    });

    const response = await client.send(command);

    const text = response.output?.message?.content?.[0]?.text?.trim();
    if (!text) {
      throw new Error("Bedrock returned empty completion");
    }

    return {
      text,
      provider: "bedrock",
      model: this.options.modelId,
      latencyMs: 0,
      usage: {
        inputTokens: response.usage?.inputTokens,
        outputTokens: response.usage?.outputTokens,
      },
    };
  }
}
