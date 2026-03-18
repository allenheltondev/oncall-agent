import type { AppConfig } from "../config/env";

const TSH = Bun.env.TSH_PATH ?? "tsh";

export interface TeleportSessionStatus {
  valid: boolean;
  expiresAt?: string;
  username?: string;
  awsProfile?: string;
}

export async function checkTeleportSession(config: AppConfig): Promise<TeleportSessionStatus> {
  try {
    const proc = Bun.spawn([TSH, "status", "--format=json"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, code] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);

    if (code !== 0) {
      return { valid: false };
    }

    const status = JSON.parse(stdout);
    const now = Date.now();
    const expiresAt = new Date(status.active?.valid_until).getTime();

    if (expiresAt > now) {
      // Try to extract AWS profile from active apps
      let awsProfile: string | undefined;
      if (status.active?.apps && Array.isArray(status.active.apps)) {
        const awsApp = status.active.apps.find((app: Record<string, unknown>) => app.name === config.teleport.awsAppName);
        awsProfile = awsApp?.aws_profile;
      }

      return {
        valid: true,
        expiresAt: status.active?.valid_until,
        username: status.active?.username,
        awsProfile,
      };
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export async function loginTeleport(config: AppConfig): Promise<string> {
  if (!config.teleport.awsRole || !config.teleport.awsAppName) {
    throw new Error("TELEPORT_AWS_ROLE and TELEPORT_AWS_APP_NAME must be configured");
  }

  const proc = Bun.spawn([
    TSH,
    "apps",
    "login",
    "--aws-role", config.teleport.awsRole,
    config.teleport.awsAppName,
  ], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "inherit",
  });

  const [stdout, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(`Teleport apps login failed with exit code ${code}`);
  }

  // Extract profile name from output — try both old and new tsh formats
  const profileMatch = stdout.match(/Profile name:\s*(\S+)/i)
    ?? stdout.match(/--profile\s+(\S+)/);
  if (!profileMatch) {
    // Fall back to app name as profile (tsh convention)
    return config.teleport.awsAppName;
  }

  return profileMatch[1]!;
}

export async function ensureTeleportSession(config: AppConfig): Promise<string | undefined> {
  if (config.teleport.mockIdentity) {
    return undefined;
  }

  const status = await checkTeleportSession(config);

  if (!status.valid) {
    console.log("No valid Teleport session found. Initiating login...");
    const profile = await loginTeleport(config);
    return profile;
  }

  return status.awsProfile ?? config.teleport.awsAppName;
}
