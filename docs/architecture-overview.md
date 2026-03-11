# Architecture overview

`oncall-agent` is a local persistent incident-response runtime.

## Core components
- `src/agent` — queue + state machine runtime
- `src/publisher` — incident publisher/simulator
- `src/identity` — Teleport-gated runtime identity requests (AWS + GitHub)
- `src/workflows` — investigation, context, hypothesis, remediation, governance, safety
- `data/` — runtime context + ledger artifacts

## Runtime phases
1. RECEIVED
2. AUTH
3. INVESTIGATE
4. REPORT
5. DONE / FAILED

## Design principles
- Fail closed for privileged actions when runtime identity is unavailable
- Keep each authority request scoped and short-lived
- Persist context and audit entries for replay and operator review
