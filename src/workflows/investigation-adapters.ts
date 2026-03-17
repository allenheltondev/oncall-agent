import type { AppConfig } from "../config/env";
import { requestAwsRuntimeAccess } from "../identity/teleport-aws";
import type {
  InvestigationAdapterError,
  InvestigationContext,
  InvestigationEvidence,
} from "./investigation-types";

const DEFAULT_TIMEOUT_MS = 3000;

async function withTimeout<T>(work: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Adapter timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([work, timeout]);
}

async function safe<T>(
  adapter: InvestigationAdapterError["adapter"],
  fn: () => Promise<T>,
): Promise<{ value?: T; error?: InvestigationAdapterError }> {
  try {
    return { value: await withTimeout(fn()) };
  } catch (error) {
    return {
      error: {
        adapter,
        message: error instanceof Error ? error.message : "Unknown adapter error",
        retryable: true,
      },
    };
  }
}

export async function collectInvestigationEvidence(
  config: AppConfig,
  context: InvestigationContext,
): Promise<InvestigationEvidence> {
  await requestAwsRuntimeAccess(config, {
    scope: "cloudwatch:read",
    reason: `investigation:${context.incidentId}`,
  });

  const [logs, metrics, deploy] = await Promise.all([
    safe("cloudwatch-logs", async () => ({
      adapter: "cloudwatch-logs" as const,
      entries: [
        {
          timestamp: new Date().toISOString(),
          message: `[simulated] ${context.service} error burst around incident ${context.incidentId}`,
        },
      ],
    })),
    safe("cloudwatch-metrics", async () => ({
      adapter: "cloudwatch-metrics" as const,
      points: [
        { timestamp: new Date(Date.now() - 300000).toISOString(), value: 0.02 },
        { timestamp: new Date().toISOString(), value: 0.19 },
      ],
    })),
    safe("deploy-metadata", async () => ({
      adapter: "deploy-metadata" as const,
      commitSha: "simulated-commit-sha",
      deployedAt: new Date(Date.now() - 900000).toISOString(),
      pipeline: "staging-deploy",
    })),
  ]);

  return {
    logs: logs.value,
    metrics: metrics.value,
    deploy: deploy.value,
    errors: [logs.error, metrics.error, deploy.error].filter(
      (v): v is InvestigationAdapterError => Boolean(v),
    ),
  };
}
