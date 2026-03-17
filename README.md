# oncall-agent

A local persistent on-call incident response agent that automatically investigates, diagnoses, and remediates production incidents. It subscribes to incident signals via [Momento Topics](https://www.gomomento.com/), uses an LLM-driven agent loop (Amazon Bedrock) to investigate AWS resources, forms root-cause hypotheses, and can open remediation PRs on GitHub — all while authenticating through [Teleport](https://goteleport.com/) for zero-standing-privilege AWS access.

## What it does

The oncall-agent is a fully autonomous incident responder. When a production alert fires, it:

- **Investigates** — queries CloudWatch logs and metrics, inspects Lambda/EC2/DynamoDB resources, and reads source code to understand what went wrong.
- **Diagnoses** — correlates evidence (error spikes, recent deploys, timeout patterns) to form ranked root-cause hypotheses with confidence scores.
- **Remediates** — optionally creates a fix branch, commits a patch, pushes, and opens a GitHub PR.
- **Reports** — posts structured Slack updates at each stage: detection, investigation findings, hypothesis, and resolution outcome.

There is no human in the loop during processing. The agent runs locally as a persistent process, subscribing to a Momento topic for real-time incident signals.

## How it works

The agent runtime processes each incident through a state machine with five states:

| State | What happens |
|-------|-------------|
| **RECEIVED** | Signal is parsed, validated against the `incident.v1` schema, deduplicated by incident ID, and queued. |
| **AUTH** | A Teleport session is established (or refreshed) to obtain short-lived, scoped AWS credentials. Slack is notified that an incident is being investigated. |
| **INVESTIGATE** | An LLM agent loop runs on Amazon Bedrock. The model iteratively calls tools — `aws_cli`, `file_operation`, `git`, `github_api`, `send_slack_message` — to gather evidence, read source code, and build a diagnosis. Each AWS call goes through Teleport-issued credentials with a scoped reason (e.g. `investigation:<incidentId>`). |
| **DONE** | The agent posts a final Slack summary with its hypothesis, confidence score, and (if enabled) a link to the remediation PR. |
| **FAILED** | The error is recorded and surfaced. The incident can be retried. |

Remediation execution (branch + PR) is off by default and must be explicitly enabled via `REMEDIATION_EXECUTE` and `REMEDIATION_OPEN_PR`.

```mermaid
flowchart TD
    MO[Momento Topic] -- incident signal --> RT[Agent Runtime<br/>dedup + queue]
    RT -- enqueue --> SM

    subgraph SM[State Machine]
        direction LR
        S1[RECEIVED] --> S2[AUTH]
        S2 --> S3[INVESTIGATE]
        S3 --> S4[DONE]
        S3 -.-> S5[FAILED]
    end

    S2 -- login / refresh --> TP[Teleport Proxy]
    TP -- short-lived AWS creds<br/>scoped per investigation --> BR

    subgraph BR[LLM Agent Loop — Amazon Bedrock]
        direction TB
        T1[aws_cli]
        T2[file_operation]
        T3[git]
        T4[github_api]
        T5[send_slack_message]
        T6[complete]
    end

    T1 -- CloudWatch logs/metrics<br/>Lambda · EC2 · DynamoDB --> AWS[(AWS APIs)]
    T3 -- branch · commit · push --> GH[GitHub]
    T4 -- open PR · read repo --> GH
    T5 -- status updates --> SL[Slack]
    T6 -- summary + hypothesis --> SM
```

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

## Chat Functionality

The oncall-agent includes a chat interface for interactive incident response. Users can engage in a conversational manner to query the agent about incidents, request status updates, and even trigger remediation actions.

## Key runtime behavior

- If `MOMENTO_API_KEY` is set, agent starts **live Momento subscription mode**
- If not set, agent runs fallback startup self-check flow
- Slack hooks deliver via `SLACK_WEBHOOK_URL` if configured, otherwise stdout fallback
- Teleport provides short-lived AWS credentials per investigation — no standing access keys required
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
