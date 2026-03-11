# LLM orchestration (Issue #35)

Provider abstraction and orchestration layer for model-backed reasoning tasks.

## Components
- `LlmClient` interface (`src/llm/types.ts`)
- routing policy (`defaultModel` + per-task overrides)
- prompt templates (`src/llm/prompt-templates.ts`)
- orchestration runtime (`src/llm/orchestrator.ts`)

## Task types
- `incident_analysis`
- `hypothesis_explanation`
- `remediation_text`
- `status_summary`

## Operational behavior
- retry on transient failure
- timeout enforcement
- structured call telemetry (`llm.call` with provider/model/latency/usage)
