# Teleport runtime issuance integration (Issue #47)

Runtime identity now supports external issuer command hooks for real credential issuance.

## Config
- `TELEPORT_ISSUER_COMMAND_AWS`
- `TELEPORT_ISSUER_COMMAND_GITHUB`

Each command receives a JSON request payload on stdin and must return JSON response on stdout.

## Request payloads
- AWS: `{ scope, reason, ttlSeconds? }`
- GitHub: `{ scope, reason, ttlSeconds? }`

## Expected responses
- AWS grant: `{ accessKeyId, secretAccessKey, sessionToken, expiresAt, scope }`
- GitHub grant: `{ token, expiresAt, scope, repository }`

## Security behavior
- If mock mode is disabled and issuer commands are not configured, runtime fails closed.
- No fallback to standing credentials.
