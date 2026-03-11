# GitHub runtime identity (Issue #8)

Adds Teleport-gated runtime identity requests for GitHub operations.

## Scope levels
- `repo:read`
- `repo:write`
- `pr:create`

## Guardrail
If Teleport runtime identity is unavailable, the flow fails closed and refuses standing GitHub credentials.

## Current status
- Mock runtime token path available for local/dev validation.
- Real Teleport-backed issuance to be wired in follow-up increment.
