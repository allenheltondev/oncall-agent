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
- **GitHub authentication** — PAT (easiest) or GitHub App (production)
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

Default topic suggestion in setup: `oncall-agent.<profile>.incidents`

---

## GitHub authentication

Two options — set the relevant env vars in `.env`:

### Option 1: Personal Access Token (easiest)
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Option 2: GitHub App (recommended for production)
```env
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=789012
GITHUB_APP_PRIVATE_KEY_FILE=./path/to/private-key.pem
```

For the GitHub App:
- **App ID** — found at `https://github.com/settings/apps` → your app → General
- **Installation ID** — found at `https://github.com/settings/installations` → click the app → ID is in the URL
- **Private key** — generate at your app's settings page under "Private keys". Either point to the `.pem` file with `GITHUB_APP_PRIVATE_KEY_FILE`, or inline it as a single line with `\n` escapes in `GITHUB_APP_PRIVATE_KEY`

Verify your connection:
```bash
bun run cli -- github verify
```

---

## Validate and run

```bash
bun run cli -- config validate --config config/identity-map.v1.json
bun run cli -- doctor
bun run cli -- start --config config/identity-map.v1.json
```

---

## Key runtime behavior

- If `MOMENTO_API_KEY` is set, agent starts **live Momento subscription mode**
- If not set, agent runs fallback startup self-check flow
- Slack hooks deliver via `SLACK_WEBHOOK_URL` if configured, otherwise stdout fallback
- Remediation execution is **off by default**:
  - `REMEDIATION_EXECUTE=false`
  - `REMEDIATION_OPEN_PR=false`

---

## CLI commands

| Command | Description |
|---------|-------------|
| `bun run cli -- setup` | Interactive setup wizard |
| `bun run cli -- doctor` | Readiness check matrix |
| `bun run cli -- start --config <path>` | Start the agent |
| `bun run cli -- config validate --config <path>` | Validate identity map |
| `bun run cli -- config llm show` | Show LLM config |
| `bun run cli -- config llm set --api-key <key>` | Update LLM config |
| `bun run cli -- teleport status` | Check Teleport session |
| `bun run cli -- teleport login` | Login to Teleport |
| `bun run cli -- github verify` | Verify GitHub API connection |
| `bun run dev` | Watch mode |
| `bun run start` | One-shot run |
| `bun run typecheck` | TypeScript checks |
| `bun test` | Unit tests |
| `bun run publish:simulate <file> --dry-run` | Simulate incident (dry run) |
| `bun run publish:simulate <file> --live` | Simulate incident (live) |

---

## Config files

| File | Purpose |
|------|---------|
| `.env` | Runtime environment values (copy from `.env.example`) |
| `config/identity-map.v1.json` | Environment mapping for AWS/GitHub/Teleport |

---

## Environment variables

See `.env.example` for the full list with defaults. Key groups:

- **Momento** — `MOMENTO_API_KEY`, `MOMENTO_CACHE_NAME`, `MOMENTO_TOPIC_NAME`
- **Teleport** — `TELEPORT_PROXY`, `TELEPORT_CLUSTER`, `TELEPORT_MOCK_IDENTITY`
- **GitHub** — `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` or `GITHUB_APP_*`
- **Slack** — `SLACK_WEBHOOK_URL`, `SLACK_CHANNEL`
- **LLM** — `OPENAI_API_KEY`, `OPENAI_MODEL`
- **Remediation** — `REMEDIATION_EXECUTE`, `REMEDIATION_OPEN_PR`
- **Storage** — `STORAGE_MODE` (`json` or `sqlite`), `SQLITE_PATH`
