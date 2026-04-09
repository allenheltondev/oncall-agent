# Oncall Agent v2: Quick Start Guide

## What You're Building

A structured evaluation of your on-call agent in two execution environments:
- **Phase 1**: Local baseline (your laptop)
- **Phase 2**: Beams runtime

**Goal**: Document what attack vectors change from "possible but risky" (local) to "blocked by architecture" (Beams).

**Story**: "The runtime changes what a compromised model can actually do, not whether it can be compromised."

---

## Documents in This Project

| Document | Purpose | Read When |
|----------|---------|-----------|
| **v2-project-plan.md** | Full project breakdown (sections 1-10) | **Start here** |
| **v2-baseline-constraints.md** | What local baseline can/cannot do | Before impl on local |
| **v2-architecture.md** | Detailed control flows, module design | For technical implementation |
| **v2-first-5-tasks.md** | Concrete code examples for Tasks 1-5 | When ready to code |

---

## Quick Timetable

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| 0: Foundation | T1-T2 | 4-6h | Ready to start |
| 1: Baseline | T3-T5 | 7-10h | Depends on 0 |
| 2: Scenarios | T6-T8 | 6-8h | Depends on 1 |
| 3: Beams | T9-T11 | TBD | Beams APIs needed |
| 4: Reporting | T12-T13 | 2-3h | Depends on 3 |
| **Total** | 13+ | ~25-35h local | + Beams unknowns |

---

## First 5 Tasks (In Order)

### ✓ Task 1: Foundation Types (2-3h)
Create all TypeScript interfaces and types. No implementation yet.

**Deliverables**: `src/v2/agent/types.ts`, `src/v2/tools/types.ts`, `src/v2/drivers/driver-interface.ts`, `src/v2/audit/audit-model.ts`, test infrastructure

**Acceptance**: TypeScript compiles, all types are sealed

**Start with**: Read section 1 + "Task 1" in v2-first-5-tasks.md

---

### ✓ Task 2: System Prompt + Safety Rules (2-3h)
Define guardrails explicitly. Document examples of blocked instructions.

**Deliverables**: `src/v2/agent/system-prompt.ts`, `src/v2/agent/safety-checks.ts`, safety tests

**Acceptance**: System prompt is reviewable, patterns are documented, tests pass

**Start with**: Read section 6 (baseline constraints) + "Task 2" in v2-first-5-tasks.md

---

### ✓ Task 3: Audit Logger (1-2h)
All decisions logged to audit trail. Events are immutable, timestamped, queryable.

**Deliverables**: `src/v2/audit/audit-logger.ts`, audit tests

**Acceptance**: Can create audit trail, export as JSONL, query by event type

**Start with**: "Task 3" in v2-first-5-tasks.md

---

### ✓ Task 4: Stub Tools (2-3h)
All 5 approved tools are callable, validate inputs, return mock data.

**Deliverables**: `src/v2/tools/query-logs.ts` (+ 4 more), `src/v2/tools/index.ts`, tool tests

**Acceptance**: All tools export correctly, validation works, mock data matches schema

**Start with**: Tool contracts in section 3 (project plan) + "Task 4" in v2-first-5-tasks.md

---

### ✓ Task 5: Agent Loop (4-5h)
Full end-to-end: incident → model → tool validation → execution → summary → Slack.

**Deliverables**: `src/v2/agent/loop.ts`, `src/v2/drivers/local-driver.ts`, smoke test script

**Acceptance**: Smoke test passes (clean incident, 3+ tools called, audit trail written, summary generated)

**Start with**: Section 5 (architecture) + "Task 5" in v2-first-5-tasks.md

---

## After Task 5: Baseline Works

You'll have a functioning local agent that:
- ✅ Receives poisoned data without crashing
- ✅ Detects obvious attack patterns and blocks tool calls
- ✅ Recovers and continues investigation
- ✅ Logs all decisions to audit trail
- ✅ Posts summary to Slack (mock)

**Audit trail shows:**
- What tool calls were requested
- Which were safe vs dangerous
- Why dangerous ones were blocked
- The agent's final output

---

## Next: Scenarios (Tasks 6-8)

Once baseline works, add scenarios:
- Prompt injection in incident.summary
- Poisoned logs (exfil instruction in tool output)
- Indirect exfil attempt (file write)

Each scenario:
1. Mutates fixture data
2. Runs baseline agent
3. Captures audit trail
4. Verifies attack was visible + blocked

---

## Key Design Principles

### Intentionally Narrow
- 4 approved tools (5th optional)
- No shell, no arbitrary HTTP, no file access
- Focused on incident triage story

### Honest Baseline
- Local agent is NOT sandboxed
- Pattern detection can be bypassed (documented)
- But all attempts are logged
- Shows realistic local threat model

### Audit-First
- Every decision is logged
- Audit trail is the source of truth
- No "summary attack" — see full trace

### Reproducible
- Same scenarios run on local + Beams
- Comparable results
- Minimal model variance (temp=0)

---

## Risks / Assumptions

| Risk | Mitigation | Status |
|------|-----------|--------|
| Beams APIs unknown | Define driver interface first, adapt later | Ready |
| Model behaves differently | Use same model for both, temperature=0 | Assumption |
| Pattern detection fails | Document gaps, log attempts anyway | Intentional |
| Audit trail incomplete | Log before and after, comprehensive events | Planned |
| Scope creeps | This doc guards against it | In place |

---

## How to Use These Documents

1. **Read v2-project-plan.md (all sections)** — Get the full picture
2. **Review v2-baseline-constraints.md** — Understand what "honest" means
3. **Skim v2-architecture.md** — Understand control flows
4. **Use v2-first-5-tasks.md** — Copy code examples, follow task descriptions

---

## Success Criteria

After all phases complete, you should be able to document:

| Metric | Local | Beams | Difference |
|--------|-------|-------|-----------|
| Unsafe instruction detected | Yes | Yes | — |
| Unsafe action attempted | Yes (logged) | Yes (logged) | — |
| Action blocked | If pattern caught | If pattern OR sandbox | Beams adds layer |
| Data exfiltrated | Possible (host FS) | Not possible (sandbox) | **Beams difference** |
| Blast radius | Host filesystem | Zero | **Reduced** |
| Audit trail quality | Clear | Clear + infra events | **Enhanced** |

---

## Next Steps

1. ✅ Read **v2-project-plan.md** in full (this sets context)
2. ✅ Read **v2-baseline-constraints.md** (clarifies ground rules)
3. → Start **Task 1** using v2-first-5-tasks.md as implementation guide
4. → Proceed through Tasks 1-5 in sequence
5. → Once baseline works, start scenarios (Tasks 6-8)
6. → Once Beams APIs are clear, adapt driver and run comparison

---

## Questions?

Before you start coding, verify these assumptions:

- [ ] You have access to Anthropic API (for running LLM locally)
- [ ] You're clear on what "honest baseline" means (read v2-baseline-constraints.md)
- [ ] You've reviewed the attack scenarios (section 9 of v2-project-plan.md)
- [ ] You understand the audit trail is the evidence (read v2-architecture.md control flows)

If any of these are unclear, review the corresponding document before starting Task 1.

---
