# Remediation execution path (Issue #48)

Runtime can now execute remediation proposals when explicitly enabled.

## Flags
- `REMEDIATION_EXECUTE=true` enables branch/commit/push execution
- `REMEDIATION_OPEN_PR=true` attempts PR creation via GitHub CLI (`gh`)

## Behavior
- Creates/updates proposal branch
- Writes remediation artifact under `artifacts/remediation/`
- Commits and pushes branch
- Optionally opens PR

## Safety default
Execution is disabled by default (`REMEDIATION_EXECUTE=false`).
