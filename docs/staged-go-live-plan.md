# Staged go-live plan (Issue #52)

## Stage 0: Local verification
- Run setup wizard and doctor command
- Execute synthetic incident path end-to-end
- Confirm governance and context artifacts

## Stage 1: Dev environment (observe only)
- Enable live Momento subscribe/publish
- Keep remediation execution disabled
- Validate Slack lifecycle notifications

Exit criteria:
- Stable event handling for 24h
- No unhandled runtime crashes

## Stage 2: Staging (proposal mode)
- Enable full investigation + hypothesis + proposal flow
- Keep `REMEDIATION_EXECUTE=false`
- Validate PR proposal quality and operator workflow

Exit criteria:
- 5+ incidents handled with acceptable proposal quality
- No unsafe guardrail bypasses

## Stage 3: Controlled production canary
- Enable for limited incident class/services
- Optionally enable execution for low-risk remediation classes only
- Monitor error budget, latency, false positive rate

Exit criteria:
- SLO-safe behavior over agreed observation window
- Security and ops sign-off

## Stage 4: Broader rollout
- Expand service scope incrementally
- Keep hard kill switch and rollback documented
- Weekly review of governance logs + outcomes

## Rollback plan
- Set `REMEDIATION_EXECUTE=false`
- Disable runtime process
- Disable Momento subscription credentials
- Notify on-call channel with reason and next steps
