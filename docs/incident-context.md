# Incident context assembly (Issue #6)

`incident-context.v1` normalizes investigation output into a persisted context object.

## Fields
- `schemaVersion`
- `incidentId`
- `service`
- `correlationId`
- `assembledAt`
- `evidence`

## Persistence
Contexts are written to:

`data/context/<incidentId>.context.v1.json`

This enables replay/debug workflows and creates a durable handoff artifact for hypothesis + remediation stages.
