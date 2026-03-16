# Teleport Session Management

The agent now includes automatic Teleport session management to ensure valid authentication before requesting AWS credentials.

## How It Works

1. **Session Check**: Before executing AWS CLI commands, the agent checks if a valid Teleport session exists
2. **Auto-Login**: If no valid session is found, the agent prompts for Teleport login
3. **Credential Issuance**: Once authenticated, the agent requests scoped AWS credentials via the issuer command

## CLI Commands

### Check Session Status
```bash
bun run cli -- teleport status
```

Returns:
```json
{
  "valid": true,
  "expiresAt": "2026-03-13T20:00:00Z",
  "username": "oncall-agent",
  "awsProfile": "my-teleport-profile",
  "proxy": "teleport.example.com:443",
  "cluster": "main"
}
```

### Manual Login
```bash
bun run cli -- teleport login
```

Returns:
```json
{
  "ok": true,
  "awsProfile": "my-teleport-profile"
}
```

Initiates interactive Teleport login via `tsh apps login` and returns the AWS profile name.

## Integration

The session check is automatically performed in:
- `executeAwsCli()` - Before any AWS CLI command execution
- Can be called manually via `ensureTeleportSession(config)`

## Mock Mode

When `TELEPORT_MOCK_IDENTITY=true`, session checks are skipped and mock credentials are used.

## Session Status Check

Uses `tsh status --format=json` to check:
- Session validity
- Expiration time
- Current username

## Login Flow

Uses `tsh apps login` with:
- `--aws-role` from `TELEPORT_AWS_ROLE` config
- App name from `TELEPORT_AWS_APP_NAME` config
- Interactive stdin/stdout for user authentication

Example command:
```bash
tsh apps login --aws-role TeleportReadOnlyAccess ReadOnly-aws-ra-integration
```

## Error Handling

- If `tsh` is not installed, session check returns `{ valid: false }`
- If login fails, throws error with exit code
- If session expires during operation, next AWS CLI call will trigger re-login
