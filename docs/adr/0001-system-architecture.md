# ADR-0001: Local persistent on-call agent architecture

- Status: Accepted
- Date: 2026-03-11

## Context
We need an always-on incident response agent that can investigate production issues and propose code remediation safely.

Constraints:
- Runtime is Bun + TypeScript
- Incident delivery is event-driven (Momento Topics)
- Infrastructure and SCM authority must be runtime-scoped (Teleport model), not long-lived credentials
- Human operators need attribution and governance visibility

## Decision
Adopt a modular architecture with explicit trust boundaries:

1. `src/agent` - persistent runtime loop and state machine
2. `src/publisher` - incident signal publisher/simulator
3. `src/identity` - runtime identity issuance and renewal flows
4. `src/workflows` - investigation + remediation orchestration
5. `src/types` - shared versioned contracts

Initial implementation is local-first:
- single process runtime
- deterministic state transitions
- structured log output

## Trust boundaries
- Agent process starts with no standing cloud/SCM authority
- Each privileged action requires runtime identity request and policy evaluation
- Short-lived credentials are used for bounded actions only
- Actions are attributable via correlation IDs and audit records

## Consequences
### Positive
- Safer autonomy model with reduced blast radius
- Clear extension points for integrations
- Easy local iteration and testing

### Trade-offs
- More upfront complexity than static credentials
- Requires robust retry/error handling around identity and messaging systems

## Follow-up ADRs
- ADR-0002: Incident signal schema/versioning
- ADR-0003: Runtime identity flow and token lifecycle
- ADR-0004: Attribution ledger model
