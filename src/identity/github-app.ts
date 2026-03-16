import { SignJWT, importPKCS8 } from "jose";

/**
 * GitHub App Authentication
 *
 * Two-step process:
 * 1. Generate JWT signed with app's private key (proves app identity)
 * 2. Exchange JWT for installation token (scoped to specific repos)
 *
 * Flow:
 *   Private Key → JWT (10min) → Installation Token (1hr) → Git Operations
 *
 * The installation token identifies as [bot]oncall-agent in commits/PRs.
 */

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

export interface GitHubAppToken {
  token: string;
  expiresAt: string;
}

/**
 * Generate a JWT signed with the app's private key.
 * This JWT proves the agent has the private key for the GitHub App.
 * Valid for 10 minutes (GitHub's maximum).
 */
export async function generateAppJWT(appId: string, privateKey: string): Promise<string> {
  // Normalize escaped newlines from .env files
  const pem = privateKey.replace(/\\n/g, "\n").trim();
  const { createPrivateKey } = await import("node:crypto");
  let key;
  try {
    key = createPrivateKey(pem);
  } catch (e: any) {
    throw new Error(`Failed to parse private key (length=${pem.length}, starts="${pem.slice(0, 40)}"): ${e.message}`);
  }

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(appId)
    .setExpirationTime("10m")
    .sign(key);

  return jwt;
}

/**
 * Exchange JWT for an installation access token.
 * This token is scoped to the repos where the app is installed
 * and has only the permissions configured in the app settings.
 * Valid for 1 hour (GitHub's default).
 */
export async function getGitHubAppInstallationToken(
  config: GitHubAppConfig,
): Promise<GitHubAppToken> {
  const jwt = await generateAppJWT(config.appId, config.privateKey);

  const response = await fetch(
    `https://api.github.com/app/installations/${config.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub App token request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

/**
 * Configure git to use the GitHub App token for authentication.
 * Sets the remote URL to: https://x-access-token:TOKEN@github.com/owner/repo.git
 * All subsequent git operations will authenticate as [bot]oncall-agent.
 */
export async function configureGitWithAppToken(
  repoPath: string,
  token: string,
  owner: string,
  repo: string,
): Promise<void> {
  const { $ } = await import("bun");

  // Configure git to use the token
  const authUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  await $`git -C ${repoPath} remote set-url origin ${authUrl}`;
}
