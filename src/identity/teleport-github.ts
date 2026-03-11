import type { AppConfig } from "../config/env";
import { runTeleportIssuer } from "./teleport-issuer";

export interface GithubRuntimeAccessRequest {
  scope: "repo:read" | "repo:write" | "pr:create";
  reason: string;
  ttlSeconds?: number;
}

export interface GithubRuntimeAccessGrant {
  token: string;
  expiresAt: string;
  scope: GithubRuntimeAccessRequest["scope"];
  repository: string;
}

export async function requestGithubRuntimeAccess(
  config: AppConfig,
  request: GithubRuntimeAccessRequest,
): Promise<GithubRuntimeAccessGrant> {
  if (!config.teleport.proxy || !config.teleport.cluster) {
    throw new Error("Teleport proxy/cluster must be configured for GitHub runtime identity issuance");
  }

  if (config.teleport.mockIdentity) {
    return {
      token: "mock-github-runtime-token",
      expiresAt: new Date(Date.now() + (request.ttlSeconds ?? 900) * 1000).toISOString(),
      scope: request.scope,
      repository: `${config.github.owner}/${config.github.repo}`,
    };
  }

  if (!config.teleport.issuerCommandGithub) {
    throw new Error(
      `Teleport GitHub issuer command is not configured (TELEPORT_ISSUER_COMMAND_GITHUB). Refusing standing SCM access for scope=${request.scope}.`,
    );
  }

  return await runTeleportIssuer<GithubRuntimeAccessRequest, GithubRuntimeAccessGrant>(
    config.teleport.issuerCommandGithub,
    request,
  );
}
