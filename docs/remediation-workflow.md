# Remediation workflow (Issue #9)

Initial automation for remediation proposal generation.

## Current behavior
- Requests scoped GitHub runtime identity (`pr:create`) via Teleport-gated path
- Builds deterministic remediation proposal payload:
  - branch name
  - commit message
  - PR title/body
  - patch summary

## Next increment
- Wire real Git branch creation + PR API calls
- Attach persisted incident context artifact links
- Add safety checks for risky patch classes
