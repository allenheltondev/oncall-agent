# Teleport Session Management Implementation

## What Was Added

### 1. Session Management Module (`src/identity/teleport-session.ts`)

Three core functions:

- **`checkTeleportSession(config)`** - Checks if valid session exists using `tsh status --format=json`
- **`loginTeleport(config)`** - Initiates interactive login via `tsh login`
- **`ensureTeleportSession(config)`** - Convenience function that checks and logs in if needed

### 2. CLI Commands

Added two new commands to the CLI:

```bash
# Check current session status
bun run cli -- teleport status

# Manually trigger login
bun run cli -- teleport login
```

### 3. Integration with AWS CLI Tool

The `executeAwsCli()` function now automatically calls `ensureTeleportSession()` before requesting AWS credentials. This ensures:

1. Valid Teleport session exists
2. User is prompted to login if session expired
3. AWS credential requests succeed

### 4. Documentation

- `docs/teleport-session-management.md` - Complete usage guide
- Updated `src/tools/README.md` with session management info

## Usage Flow

```typescript
// Automatic session management
const result = await executeAwsCli(config, {
  service: "logs",
  command: "filter-log-events",
  args: ["--log-group-name", "/aws/lambda/my-function"],
  reason: "investigation:incident-123",
});
// ↑ This will automatically check session and prompt login if needed
```

## Session Check Logic

```typescript
// Uses tsh status to check validity
const status = await checkTeleportSession(config);

if (!status.valid) {
  // Prompts user to login
  await loginTeleport(config);
}
```

## Mock Mode Behavior

When `TELEPORT_MOCK_IDENTITY=true`:
- Session checks are skipped
- No login required
- Mock credentials used directly

## Prerequisites

- `tsh` (Teleport CLI) must be installed and in PATH
- `TELEPORT_AWS_ROLE` configured (e.g., `TeleportReadOnlyAccess`)
- `TELEPORT_AWS_APP_NAME` configured (e.g., `ReadOnly-aws-ra-integration`)
- User must have access to the configured Teleport app

## Error Handling

- If `tsh` not found: Session check returns `{ valid: false }`
- If login fails: Throws error with exit code
- If session expires mid-operation: Next AWS CLI call triggers re-login
