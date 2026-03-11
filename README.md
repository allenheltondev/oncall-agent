# oncall-agent

Local persistent on-call incident response agent with runtime identity and scoped authority.

## Stack
- Runtime: **Bun**
- Language: **TypeScript**

## Prerequisites

### Required
- **Bun** `>=1.3`
- **Git**
- A local clone of this repo

### Required for live integrations
- **Momento** API key + cache/topic permissions
- **Teleport** cluster/proxy + issuer command wiring (or mock mode)
- **GitHub CLI (`gh`)** if you want runtime PR creation
- **Slack webhook URL** if you want real Slack delivery
- **OpenAI/Codex API key** for LLM-backed summaries/reasoning

### Optional
- Docker + Docker Compose (containerized local run)
- VS Code Dev Containers

---

## Quick start

```bash
bun install
bun run cli -- setup
bun run cli -- doctor
bun run cli -- start --config config/identity-map.v1.json
```

If you just want local scaffold behavior first, run setup with selected modules and keep mock identity on.

---

## Setup modes

### Interactive full setup
```bash
bun run cli -- setup
```

### Interactive partial setup (pausable)
```bash
bun run cli -- setup --modules llm,slack
```

### Non-interactive setup (CI/scripted)
```bash
bun run cli -- setup --non-interactive \
  --env-file .env \
  --config config/identity-map.v1.json \
  --profile dev \
  --momento-api-key ... \
  --momento-cache oncall-agent \
  --momento-topic oncall-agent.dev.incidents \
  --teleport-proxy ... \
  --teleport-cluster main \
  --teleport-audience oncall-agent \
  --github-owner your-org \
  --github-repo oncall-agent \
  --github-base-branch main \
  --openai-api-key ... \
  --openai-model gpt-5.3-codex
```

Default topic suggestion in setup:
- `oncall-agent.<profile>.incidents`

---

## Validate and run

```bash
bun run cli -- config validate --config config/identity-map.v1.json
bun run cli -- doctor
bun run cli -- start --config config/identity-map.v1.json
```

---

## Key runtime behavior

- If `MOMENTO_API_KEY` is set, agent starts **live Momento subscription mode**.
- If not set, agent runs fallback startup self-check flow.
- Slack hooks deliver via `SLACK_WEBHOOK_URL` if configured, otherwise stdout fallback.
- Remediation execution is **off by default**:
  - `REMEDIATION_EXECUTE=false`
  - `REMEDIATION_OPEN_PR=false`

---

## Common commands

- `bun run dev` - watch mode
- `bun run start` - one-shot run
- `bun run cli -- doctor` - readiness matrix
- `bun run typecheck` - TypeScript checks
- `bun test` - unit tests
- `bun run publish:simulate data/incidents/synthetic.failure.v1.json --dry-run`
- `bun run publish:simulate data/incidents/synthetic.failure.v1.json --live`

---

## Config files

- `.env` - runtime env values
- `config/identity-map.v1.json` - environment mapping for AWS/GitHub/Teleport

---

## Operations docs

- `docs/ops-runbook.md`
- `docs/momento-subscription.md`
- `docs/teleport-runtime-issuance.md`
- `docs/remediation-execution.md`
- `docs/security-secrets.md`
- `docs/production-readiness-checklist.md`
- `docs/staged-go-live-plan.md`
- `docs/sqlite-storage.md`
