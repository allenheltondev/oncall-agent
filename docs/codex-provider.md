# Codex provider adapter (Issue #36)

The Codex adapter implements `LlmClient` using OpenAI-compatible chat completions.

## Config
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-5.3-codex`)
- optional `OPENAI_BASE_URL`

## Behavior
- request timeout enforcement
- structured usage extraction (`prompt_tokens`, `completion_tokens`)
- error propagation with status/body details for debugging

## Integration
Use this adapter through `LlmOrchestrator` so workflows remain provider-agnostic.
