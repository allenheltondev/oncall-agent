# Teleport runtime issuance integration (Issue #47)

Runtime identity now supports external issuer command hooks for real credential issuance.

## Config
- `TELEPORT_ISSUER_COMMAND_AWS`

The command receives a JSON request payload on stdin and must return JSON response on stdout.

## Request payload
- AWS: `{ scope, reason, ttlSeconds? }`

## Expected response
- AWS grant: `{ accessKeyId, secretAccessKey, sessionToken, expiresAt, scope }`

## Security behavior
- If mock mode is disabled and issuer command is not configured, runtime fails closed.
- No fallback to standing credentials.
