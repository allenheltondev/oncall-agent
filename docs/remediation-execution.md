# Remediation execution path (Issue #48)

Runtime can now execute remediation proposals when explicitly enabled.

## Flags
- `REMEDIATION_EXECUTE=true` enables branch/commit/push execution
- `REMEDIATION_OPEN_PR=true` attempts PR creation via GitHub CLI (`gh`)

## Behavior
- Verifies repository binding matches configured `owner/repo`
- Requires clean working tree by default
- Creates/updates proposal branch
- Writes remediation artifact under `artifacts/remediation/`
- Commits and pushes branch
- Optionally opens PR against configured base branch

## Safety default
Execution is disabled by default (`REMEDIATION_EXECUTE=false`).
To bypass clean-tree enforcement (not recommended), set `REMEDIATION_ALLOW_DIRTY_WORKTREE=true`.
