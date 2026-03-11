# Root-cause hypothesis engine (Issue #7)

Deterministic baseline engine that ranks likely causes from incident context.

Current rule signals:
- metric spikes (`traffic-spike-regression`)
- timeout log markers (`downstream-timeout`)
- recent deployment metadata (`recent-deploy-regression`)

Output:
- ranked hypotheses
- confidence score (0-1)
- explicit evidence references per hypothesis

Fallback hypothesis:
- `insufficient-evidence` when context lacks strong indicators
