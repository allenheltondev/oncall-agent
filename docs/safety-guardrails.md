# Safety guardrails (Issue #13)

Current guardrails before remediation proposal emission:

- global kill switch (`AGENT_KILL_SWITCH=true`)
- per-run remediation budget
- deny-listed patch pattern detection
- minimum confidence requirement
- evidence reliability threshold

If any guardrail fails, remediation proposal is skipped and reasons are logged.
