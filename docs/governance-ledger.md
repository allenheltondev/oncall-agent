# Attribution & governance ledger (Issue #10)

Tracks privileged agent operations with identity scope, auth decision, and outcome.

## Storage
- JSONL audit stream: `data/ledger/governance-ledger.jsonl`
- Snapshot artifact: `data/ledger/latest-governance-snapshot.json`

## Entry shape
- timestamp
- incidentId
- correlationId
- action
- identityScope
- authDecision (`allow|deny`)
- outcome (`success|failure`)
- details (optional)

This provides traceability for runtime identity and remediation actions.
