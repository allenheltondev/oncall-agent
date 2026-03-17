import type { AppConfig } from "../config/env";
import { runTeleportIssuer } from "./teleport-issuer";

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

  if (!config.teleport.proxy || !config.teleport.cluster) {
    throw new Error("Teleport proxy/cluster must be configured for runtime identity issuance");
  }

  if (!config.teleport.issuerCommandAws) {
    throw new Error(
      `Teleport AWS issuer command is not configured (TELEPORT_ISSUER_COMMAND_AWS). Refusing standing credentials for scope=${request.scope}.`,
    );
  }

  return await runTeleportIssuer<AwsRuntimeAccessRequest, AwsRuntimeAccessGrant>(
    config.teleport.issuerCommandAws,
    request,
  );
}
