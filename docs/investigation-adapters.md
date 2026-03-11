# Investigation adapters (Issue #5)

Current adapter set:
- `cloudwatch-logs` (read-only)
- `cloudwatch-metrics` (read-only)
- `deploy-metadata` (read-only)

## Error model
All adapter failures are normalized into:

```ts
{
  adapter: "cloudwatch-logs" | "cloudwatch-metrics" | "deploy-metadata";
  message: string;
  retryable: boolean;
}
```

## Runtime identity requirement
Before collecting evidence, the runtime requests scoped AWS identity (`cloudwatch:read`) through Teleport-gated issuance.

If runtime identity cannot be issued, processing fails closed.
