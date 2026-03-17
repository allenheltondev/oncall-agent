# Ops runbook

## 1) Local startup
```bash
bun install
bun run dev
```

Optional:
```bash
docker compose up --build
```

## 2) Required env for mock-mode local run
- `TELEPORT_PROXY=teleport.example.com:443`
- `TELEPORT_CLUSTER=main`
- `TELEPORT_MOCK_IDENTITY=true`

## 3) Validate
```bash
bun run typecheck
bun test
bun run start
```

## 4) Common troubleshooting
- **Error: Teleport proxy/cluster must be configured**
  - Set `TELEPORT_PROXY` and `TELEPORT_CLUSTER`, or enable mock mode.
- **Remediation skipped**
  - Check guardrail reasons in logs (`incident.remediation.skipped`).
- **Missing artifacts**
  - Context: `data/context/*.context.v1.json`

## 5) Operational checks
- Verify context artifact written per incident
- Verify top hypothesis and remediation proposal events emitted
