export type LlmTaskType =
  | "incident_analysis"
  | "hypothesis_explanation"
  | "remediation_text"
  | "status_summary";

export interface LlmRequest {
  taskType: LlmTaskType;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmResponse {
  text: string;
  model: string;
  provider: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  latencyMs: number;
}

export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export interface LlmRoutingPolicy {
  defaultModel: string;
  byTask?: Partial<Record<LlmTaskType, string>>;
}
