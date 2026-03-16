# Teleport AWS Apps Login Configuration

## Updated Command

The agent now uses `tsh apps login` instead of `tsh login`:

```bash
tsh apps login --aws-role TeleportReadOnlyAccess ReadOnly-aws-ra-integration
```

## Configuration

Add to `.env`:

```bash
TELEPORT_AWS_ROLE=TeleportReadOnlyAccess
TELEPORT_AWS_APP_NAME=ReadOnly-aws-ra-integration
```

## Setup Wizard

Interactive prompts:
```bash
bun run cli -- setup --modules teleport
```

Non-interactive:
```bash
bun run cli -- setup --non-interactive \
  --teleport-aws-role TeleportReadOnlyAccess \
  --teleport-aws-app-name ReadOnly-aws-ra-integration
```

## CLI Commands

```bash
# Check session status
bun run cli -- teleport status

# Login with configured role and app
bun run cli -- teleport login
```

## How It Works

1. When `executeAwsCli()` is called, it checks for a valid Teleport session
2. If no valid session exists, it runs:
   ```bash
   tsh apps login --aws-role <TELEPORT_AWS_ROLE> <TELEPORT_AWS_APP_NAME>
   ```
3. User authenticates interactively
4. Command returns AWS profile name (e.g., "my-teleport-profile")
5. Profile is passed to AWS CLI via `--profile` flag
6. Session is established and AWS credentials can be requested

## Example

```typescript
// This will automatically login if needed
const result = await executeAwsCli(config, {
  service: "logs",
  command: "filter-log-events",
  args: ["--log-group-name", "/aws/lambda/my-function"],
  reason: "investigation:incident-123",
});
```

Behind the scenes:
1. Checks `tsh status` for valid session
2. If invalid, runs `tsh apps login --aws-role TeleportReadOnlyAccess ReadOnly-aws-ra-integration`
3. Captures AWS profile name from login output
4. Passes profile to AWS CLI via `--profile <profile-name>`
5. Requests AWS credentials via issuer command
6. Executes AWS CLI with those credentials
