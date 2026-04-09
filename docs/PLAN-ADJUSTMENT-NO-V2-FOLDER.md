# Oncall Agent v2: Plan Adjustment (Real Folders)

**Decision:** Rewrite existing v1 code in place instead of creating `src/v2/` folder.

**Rationale:** Simpler, cleaner, v1 is in git history anyway.

---

## Path Changes

| Original Plan | Updated Target |
|---------------|-----------------|
| `src/v2/agent/` | `src/agent/` |
| `src/v2/tools/` | `src/tools/` |
| `src/v2/drivers/` | `src/drivers/` |
| `src/v2/audit/` | `src/audit/` |
| `src/v2/scenarios/` | `src/scenarios/` |
| `src/v2/results/` | `src/results/` |
| `test/v2/` | `test/agent/` |
| `data/v2/` | `data/scenarios/` + `data/results/` |
| `docs/v2-*` | Keep as-is (e.g., `docs/agent-plan.md`) |

---

## What Stays

✅ Keep these from v1 (reuse):
- `src/config/env.ts` — AppConfig, environment setup
- `src/identity/` — GitHub app, Teleport (if needed for Slack auth)
- `src/llm/types.ts` — Message/Tool types (adapt if needed)
- Type infrastructure

❌ Remove or replace:
- `src/agent/chat.ts` — Rewrite with new loop
- `src/agent/runtime.ts` — Simplify or remove
- `src/agent/state-machine.ts` — Simplify or remove
- `src/tools/aws-cli.ts` — Remove (v2 uses stubs only)
- `src/tools/` broadly — Replace with 5 approved stub tools
- `src/publisher/` — Simplify (mock only for v2)
- `src/workflows/` — Remove (not needed for narrow v2)

---

## Updated Repo Structure

```
c:\git\oncall-agent\
├── docs/
│   ├── agent-plan.md                  (was v2-project-plan.md)
│   ├── baseline-constraints.md        (was v2-baseline-constraints.md)
│   ├── architecture.md                (was v2-architecture.md)
│   ├── first-5-tasks.md              (was v2-first-5-tasks.md)
│   └── quickstart.md                  (was v2-quickstart.md)
│
├── src/
│   ├── config/                        (KEEP: env, identity-map)
│   ├── identity/                      (KEEP: if needed for auth)
│   ├── agent/
│   │   ├── types.ts                  (NEW: core interfaces)
│   │   ├── system-prompt.ts          (NEW/REWRITE: guardrails + rules)
│   │   ├── loop.ts                   (NEW: agent orchestration)
│   │   ├── safety-checks.ts          (NEW: pattern detection)
│   │   ├── chat.ts                   (ARCHIVE as reference)
│   │   └── runtime.ts                (ARCHIVE as reference)
│   │
│   ├── tools/
│   │   ├── types.ts                  (NEW: tool contracts)
│   │   ├── index.ts                  (NEW: registry)
│   │   ├── get-incident-context.ts   (NEW)
│   │   ├── query-logs.ts             (NEW)
│   │   ├── query-metrics.ts          (NEW)
│   │   ├── post-slack-summary.ts     (NEW)
│   │   ├── open-followup-issue.ts    (NEW)
│   │   ├── tools.test.ts             (NEW)
│   │   └── [v1 tools]                (REMOVE/ARCHIVE)
│   │
│   ├── drivers/
│   │   ├── driver-interface.ts       (NEW: common contract)
│   │   ├── local-driver.ts           (NEW: baseline impl)
│   │   └── beams-driver.ts           (DEFER: Beams runtime)
│   │
│   ├── audit/
│   │   ├── audit-model.ts            (NEW: event types)
│   │   ├── audit-logger.ts           (NEW: event capture)
│   │   └── audit-logger.test.ts      (NEW)
│   │
│   ├── scenarios/
│   │   ├── scenarios.ts              (NEW: attack definitions)
│   │   ├── poisoner.ts               (NEW: mutation logic)
│   │   ├── runner.ts                 (NEW: scenario harness)
│   │   └── runner.test.ts            (NEW)
│   │
│   ├── results/
│   │   ├── comparison.ts             (NEW: result storage)
│   │   └── reporter.ts               (NEW: markdown output)
│   │
│   ├── cli.ts                        (KEEP as-is or minimal update)
│   └── [other v1 modules]            (KEEP/ARCHIVE as needed)
│
├── test/agent/
│   ├── fixtures.ts                   (NEW: test utilities)
│   ├── types.test.ts                 (NEW)
│   ├── safety-checks.test.ts         (NEW)
│   ├── audit.test.ts                 (NEW)
│   ├── tools.test.ts                 (NEW)
│   ├── loop.test.ts                  (NEW)
│   └── scenarios.test.ts             (NEW)
│
├── data/
│   ├── scenarios/                    (NEW: test incidents + poisoned variants)
│   │   ├── clean-incident.json
│   │   ├── poisoned-prompt-injection.json
│   │   ├── poisoned-logs-exfil.json
│   │   └── poisoned-metrics-hidden.json
│   │
│   └── results/                      (NEW: audit logs + comparison matrix)
│       ├── local-run-1.jsonl
│       ├── beams-run-1.jsonl
│       └── comparison-matrix.md
│
└── [existing v1 structure preserved/archived]
```

---

## Task Adjustments

**Task 1: Foundation Types**
- Create `src/agent/types.ts` (not `src/v2/agent/types.ts`)
- Import `AppConfig` from `src/config/env.ts`
- All other new types as planned

**Task 2: System Prompt + Safety Rules**
- Create `src/agent/system-prompt.ts` (rewrite existing)
- Create `src/agent/safety-checks.ts`
- Files in real location

**Task 3: Audit Logger**
- Create `src/audit/audit-model.ts`
- Create `src/audit/audit-logger.ts`
- Real location

**Task 4: Stub Tools**
- Create `src/tools/` files as planned
- Remove or archive v1's `src/tools/aws-cli.ts` etc.
- Keep `src/tools/index.ts` (registry)

**Task 5: Agent Loop**
- Create `src/agent/loop.ts` (new orchestration)
- Create `src/drivers/local-driver.ts`
- Rewrite `src/agent/chat.ts` or archive it

---

## Files to Update in Docs

The planning documents already use abstract paths. **Rename them:**

- `docs/v2-project-plan.md` → `docs/agent-plan.md`
- `docs/v2-baseline-constraints.md` → `docs/baseline-constraints.md`
- `docs/v2-architecture.md` → `docs/architecture.md`
- `docs/v2-first-5-tasks.md` → `docs/first-5-tasks.md`
- `docs/v2-quickstart.md` → `docs/quickstart.md`

In all docs, replace:
- `src/v2/` → `src/`
- `data/v2/` → `data/`
- `test/v2/` → `test/agent/`

**No conceptual changes to the plan itself — just paths.**

---

## Git History

All v1 code is safe. When ready, you can:
- `git log --oneline` to see commits before rewrite
- `git show <commit>:src/agent/chat.ts` to reference old implementation
- `git diff` to review what changed

---

## Next Steps

1. Rename docs/ files (if desired)
2. Start Task 1 targeting real folders
3. Archive old code files as you replace them (don't delete, rename to `.old` or move to `.archive/`)

---
