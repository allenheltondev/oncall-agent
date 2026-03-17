import type { AppConfig } from "../config/env";
import { getGitHubAppInstallationToken, generateAppJWT } from "./github-app";

export interface GitHubVerifyResult {
  ok: boolean;
  authMethod: "pat" | "app" | "none";
  repo: string;
  repoAccessible: boolean;
  user?: string;
  scopes?: string;
  error?: string;
}

export async function verifyGitHub(config: AppConfig): Promise<GitHubVerifyResult> {
  const repo = `${config.github.owner}/${config.github.repo}`;

  if (config.github.appId && config.github.appPrivateKey && config.github.appInstallationId) {
    return verifyApp(config, repo);
  } else if (config.github.token) {
    return verifyPat(config.github.token, repo);
  }
  return { ok: false, authMethod: "none", repo, repoAccessible: false, error: "No GitHub credentials configured (set GITHUB_TOKEN or GitHub App env vars)" };
}

async function verifyApp(config: AppConfig, repo: string): Promise<GitHubVerifyResult> {
  const authMethod = "app" as const;

  // Step 1: Verify JWT against /app
  let jwt: string;
  let appName: string | undefined;
  try {
    jwt = await generateAppJWT(config.github.appId!, config.github.appPrivateKey!);
    const res = await fetch("https://api.github.com/app", {
      headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, authMethod, repo, repoAccessible: false, error: `JWT rejected by GitHub /app (${res.status}): ${body}` };
    }
    const data = (await res.json()) as { name?: string; slug?: string };
    appName = data.name ?? data.slug;
  } catch (e: unknown) {
    return { ok: false, authMethod, repo, repoAccessible: false, error: `JWT generation failed: ${(e as Error).message}` };
  }

  // Step 2: Exchange for installation token
  let token: string;
  try {
    const appToken = await getGitHubAppInstallationToken({
      appId: config.github.appId!,
      privateKey: config.github.appPrivateKey!,
      installationId: config.github.appInstallationId!,
    });
    token = appToken.token;
  } catch (e: unknown) {
    return { ok: false, authMethod, repo, repoAccessible: false, user: appName, error: `Installation token failed (installationId=${config.github.appInstallationId}): ${(e as Error).message}` };
  }

  // Step 3: Check repo access with installation token
  let repoAccessible = false;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    repoAccessible = res.ok;
  } catch { /* ignored */ }

  return { ok: repoAccessible, authMethod, repo, repoAccessible, user: appName };
}

async function verifyPat(token: string, repo: string): Promise<GitHubVerifyResult> {
  const authMethod = "pat" as const;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let user: string | undefined;
  let scopes: string | undefined;
  try {
    const res = await fetch("https://api.github.com/user", { headers });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, authMethod, repo, repoAccessible: false, error: `PAT auth failed (${res.status}): ${body}` };
    }
    const data = (await res.json()) as { login?: string };
    user = data.login;
    scopes = res.headers.get("x-oauth-scopes") ?? undefined;
  } catch (e: unknown) {
    return { ok: false, authMethod, repo, repoAccessible: false, error: `PAT request failed: ${(e as Error).message}` };
  }

  let repoAccessible = false;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    repoAccessible = res.ok;
  } catch { /* ignored */ }

  return { ok: repoAccessible, authMethod, repo, repoAccessible, user, scopes };
}
