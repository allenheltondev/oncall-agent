# End-to-end scenarios (Issue #12)

Initial deterministic e2e harness validates:

1. Incident payload parse
2. Investigation evidence collection
3. Incident context persistence
4. Hypothesis generation
5. Remediation proposal generation
6. Governance ledger append

Run via tests:

```bash
bun test src/workflows/e2e-scenarios.test.ts
```

This is the baseline for CI-level scenario coverage before adding external API stubs and failure-path matrixes.
