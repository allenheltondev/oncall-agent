# AWS CLI Tool

Wrapper for executing AWS CLI commands with runtime-issued credentials from Teleport.

## Features

- Automatic credential injection from Teleport-gated identity
- Automatic Teleport session management (checks validity, prompts login if needed)
- Scoped access with audit trail
- Fail-closed security model
- Support for any AWS CLI service/command

## Usage

```typescript
import { executeAwsCli } from "./tools/aws-cli";

const result = await executeAwsCli(config, {
  service: "logs",
  command: "filter-log-events",
  args: [
    "--log-group-name", "/aws/lambda/my-function",
    "--start-time", `${Date.now() - 3600000}`,
    "--filter-pattern", "ERROR",
  ],
  reason: "investigation:incident-123",
});

if (result.success) {
  const data = JSON.parse(result.stdout);
  console.log(data);
} else {
  console.error(result.stderr);
}
```

## Request Structure

```typescript
interface AwsCliRequest {
  service: string;      // AWS service (e.g., "logs", "ec2", "lambda")
  command: string;      // CLI command (e.g., "describe-instances")
  args?: string[];      // Additional arguments
  reason: string;       // Audit reason (e.g., "investigation:incident-123")
}
```

## Response Structure

```typescript
interface AwsCliResponse {
  stdout: string;       // Command output
  stderr: string;       // Error output
  exitCode: number;     // Process exit code
  success: boolean;     // true if exitCode === 0
}
```

## Security

- Credentials are requested just-in-time via `requestAwsRuntimeAccess()`
- Currently scoped to `cloudwatch:read` (can be extended)
- All requests logged to governance ledger
- No standing credentials used

## Examples

See `aws-cli-examples.ts` for common patterns:
- Fetching CloudWatch logs
- Getting metric statistics
- Describing EC2 instances
- Lambda function inspection

## Prerequisites

- AWS CLI installed and available in PATH
- Teleport issuer command configured or mock mode enabled
- Appropriate IAM role permissions in identity-map.v1.json
