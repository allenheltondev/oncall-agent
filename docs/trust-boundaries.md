# Trust boundaries

## Boundary A: Incident ingress
- Input: incident signal payload (`incident.v1`)
- Controls: schema parse + strict validation

## Boundary B: Cloud investigation access
- Input: request for cloud telemetry
- Controls: Teleport-gated AWS runtime identity (`cloudwatch:read`), fail-closed

## Boundary C: SCM remediation authority
- Input: request to prepare remediation path
- Controls: Teleport-gated GitHub runtime identity (`pr:create`), fail-closed

## Boundary D: Human-facing updates
- Input: lifecycle state changes
- Controls: structured events, governance ledger, safety gates

## Boundary E: Automated remediation decision
- Controls:
- kill switch
- remediation budget limits
- denylisted patch patterns
- minimum confidence + evidence quality checks

If any boundary control fails, the workflow halts or degrades safely.
