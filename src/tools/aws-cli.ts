import type { AppConfig } from "../config/env";
import { ensureTeleportSession } from "../identity/teleport-session";

const AWS_CLI = Bun.env.AWS_CLI_PATH ?? "aws";

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

  const userArgs = (request.args ?? []).map(a => a.replace(/^(['"])(.*?)\1$/, "$2"));
  const args = [request.service, request.command, ...userArgs];
  if (!userArgs.includes("--region")) args.push("--region", config.awsRegion);
  if (!userArgs.includes("--output")) args.push("--output", "json");
  args.push("--no-cli-pager");
  if (awsProfile) {
    args.push("--profile", awsProfile);
  }

  console.log(`    [aws-cli] ${AWS_CLI} ${args.join(" ")}`);
  const proc = Bun.spawn([AWS_CLI, ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AWS_REGION: config.awsRegion,
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  // Truncate large outputs to avoid overwhelming the model context
  const maxLen = 40_000;
  const truncated = stdout.length > maxLen;
  const output = truncated ? stdout.slice(0, maxLen) + `\n...[truncated, ${stdout.length} total chars]` : stdout;

  return {
    stdout: output,
    stderr,
    exitCode,
    success: exitCode === 0,
  };
}
