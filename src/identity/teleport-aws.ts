import type { AppConfig } from "../config/env";

export interface AwsRuntimeAccessRequest {
  scope: "cloudwatch:read" | "metrics:read" | "deployments:read";
  reason: string;
  ttlSeconds?: number;
}

export interface AwsRuntimeAccessGrant {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiresAt: string;
  scope: AwsRuntimeAccessRequest["scope"];
}

export async function requestAwsRuntimeAccess(
  config: AppConfig,
  request: AwsRuntimeAccessRequest,
): Promise<AwsRuntimeAccessGrant> {
  if (!config.teleport.proxy || !config.teleport.cluster) {
    throw new Error("Teleport proxy/cluster must be configured for runtime identity issuance");
  }

  if (config.teleport.mockIdentity) {
    const expiresAt = new Date(Date.now() + (request.ttlSeconds ?? 900) * 1000).toISOString();
    return {
      accessKeyId: "mock-access-key-id",
      secretAccessKey: "mock-secret-access-key",
      sessionToken: "mock-session-token",
      expiresAt,
      scope: request.scope,
    };
  }

  // Placeholder for real Teleport-backed issuance flow.
  // Intentionally fail closed until the integration is wired.
  throw new Error(
    `Teleport runtime AWS identity flow not wired yet for scope=${request.scope}. Refusing to continue with standing credentials.`,
  );
}
