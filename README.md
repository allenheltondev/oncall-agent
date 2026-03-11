# oncall-agent

Local persistent on-call incident response agent with runtime identity and scoped authority.

## Stack
- Runtime: **Bun**
- Language: **TypeScript**

## Quick start
```bash
bun install
bun run dev
```

Or with Docker Compose:
```bash
docker compose up --build
```

Or in a devcontainer:
- Open in VS Code Dev Containers
- Container runs `bun install` on create

## Scripts
- `bun run dev` - watch mode
- `bun run start` - one-shot run
- `bun run cli -- config validate --config config/identity-map.v1.json` - validate identity map config
- `bun run cli -- start --config config/identity-map.v1.json` - start agent with explicit config path check
- `bun run typecheck` - TypeScript checks
- `bun test` - unit tests
- `bun run publish:simulate data/incidents/synthetic.failure.v1.json` - emit a fixture incident (dry-run without Momento key)

## Environment
Copy `.env.example` and set values as needed.

Key variables:
- `MOMENTO_API_KEY`, `MOMENTO_CACHE_NAME`, `MOMENTO_TOPIC_NAME`
- `TELEPORT_PROXY`, `TELEPORT_CLUSTER`, `TELEPORT_AUDIENCE`, `TELEPORT_MOCK_IDENTITY`
- `AWS_REGION`
- `GITHUB_OWNER`, `GITHUB_REPO`

## Initial structure
- `src/agent` - persistent runtime loop
- `src/publisher` - incident signal publisher (Momento)
- `src/identity` - Teleport runtime identity flows
- `src/workflows` - investigation/remediation workflows
- `src/types` - shared contracts
- `src/config` - runtime config loading and validation
- `docs` - architecture/ADR/runbooks
- `infra` - infra assets

## Architecture decisions
- ADR-0001: `docs/adr/0001-system-architecture.md`

## Operations docs
- Architecture: `docs/architecture-overview.md`
- Trust boundaries: `docs/trust-boundaries.md`
- Runbook: `docs/ops-runbook.md`
- LLM orchestration: `docs/llm-orchestration.md`
- Codex provider: `docs/codex-provider.md`

## Identity mapping config
- File: `config/identity-map.v1.json`
- Purpose: pair AWS account/roles with GitHub target repo and Teleport identity context per environment
