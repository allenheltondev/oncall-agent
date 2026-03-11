export interface InvestigationAdapterError {
  adapter: "cloudwatch-logs" | "cloudwatch-metrics" | "deploy-metadata";
  message: string;
  retryable: boolean;
}

export interface InvestigationEvidence {
  logs?: {
    adapter: "cloudwatch-logs";
    entries: Array<{ timestamp: string; message: string }>;
  };
  metrics?: {
    adapter: "cloudwatch-metrics";
    points: Array<{ timestamp: string; value: number }>;
  };
  deploy?: {
    adapter: "deploy-metadata";
    commitSha: string;
    deployedAt: string;
    pipeline: string;
  };
  errors: InvestigationAdapterError[];
}

export interface InvestigationContext {
  incidentId: string;
  service: string;
  correlationId?: string;
}
