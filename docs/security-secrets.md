# CLI secret hardening (Issue #51)

## Current protections
- Known secret fields are masked in CLI output
- Setup summary redacts API key values
- `config llm show` never prints full API key
- Redaction helpers are test-covered

## Operational guidance
- Prefer using `.env` locally only in trusted environments
- Never commit `.env` with real credentials
- Rotate exposed tokens immediately
- Consider external secret managers for production
