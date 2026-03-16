import type { AppConfig } from "../config/env";
import type { AwsRuntimeAccessGrant } from "../identity/teleport-aws";
import { requestAwsRuntimeAccess } from "../identity/teleport-aws";
import { ensureTeleportSession } from "../identity/teleport-session";

export interface AwsCliRequest {
  service: string;
  command: string;
  args?: string[];
  reason: string;
}

export interface AwsCliResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function executeAwsCli(
  config: AppConfig,
  request: AwsCliRequest,
): Promise<AwsCliResponse> {
  const awsProfile = await ensureTeleportSession(config);

  const grant = await requestAwsRuntimeAccess(config, {
    scope: "cloudwatch:read",
    reason: request.reason,
  });

  const args = [request.service, request.command, ...(request.args ?? []), "--region", config.awsRegion];
  if (awsProfile) {
    args.push("--profile", awsProfile);
  }

  const proc = Bun.spawn(["aws", ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: grant.accessKeyId,
      AWS_SECRET_ACCESS_KEY: grant.secretAccessKey,
      AWS_SESSION_TOKEN: grant.sessionToken,
      AWS_REGION: config.awsRegion,
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    stdout,
    stderr,
    exitCode,
    success: exitCode === 0,
  };
}
