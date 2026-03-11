# Production readiness checklist (Issue #52)

## Ownership
- Service owner:
- Security reviewer:
- Ops approver:
- Date:

## Readiness gates

### 1) Core integrations
- [ ] Momento live subscribe path validated in staging
- [ ] Momento live publish path validated in staging
- [ ] Teleport runtime issuer commands configured + tested
- [ ] Slack webhook delivery + retries validated
- [ ] GitHub remediation execution path tested (dry-run + live)

### 2) Safety + governance
- [ ] Guardrails enabled and tested (kill switch, denylist, confidence)
- [ ] Governance ledger entries verified for privileged actions
- [ ] Secrets handling reviewed (no raw key output in CLI/logs)

### 3) Reliability
- [ ] `oncall-agent doctor` returns all green in target environment
- [ ] Recovery behavior tested (restart, reconnect, transient failures)
- [ ] Alerting wired for failed subscription/delivery/remediation steps

### 4) Operational process
- [ ] Incident triage runbook reviewed by on-call
- [ ] Rollback/disable command documented and tested
- [ ] Human approval boundaries documented and accepted

## Go/No-Go
- [ ] Approved for staged rollout
- [ ] Approved for production
