# Slack lifecycle hooks

Hook events:
- `problem_detected`
- `working_hypothesis`
- `resolution_path_proposed`
- `resolution_outcome`

## Delivery modes

1. **Webhook mode** (real delivery)
   - Enabled when `SLACK_WEBHOOK_URL` is set
   - Uses HTTP webhook delivery with retry/backoff
   - Logs `slack.hook.delivered` on success

2. **Stdout mode** (fallback)
   - Used when webhook URL is not configured
   - Emits structured JSON logs for local testing

## Routing
- Default channel metadata via `SLACK_CHANNEL`
- Environment-aware routing can be layered via setup/profile values

## Reliability
- Up to 3 delivery attempts per hook event
- Structured failure log emitted on exhausted retries (`slack.hook.failed`)
