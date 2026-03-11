# Momento live subscription loop (Issue #44)

`oncall-agent start` now supports a live Momento Topic subscription mode when `MOMENTO_API_KEY` is set.

## Behavior
- Starts a long-running topic subscription for configured cache/topic
- Parses inbound items as `incident.v1` payloads
- Enqueues valid incidents into runtime state machine
- Logs parse/subscription errors without crashing process
- Handles SIGINT/SIGTERM for graceful unsubscribe

## Fallback mode
If `MOMENTO_API_KEY` is not set, runtime keeps existing local startup self-check behavior.

## Note
Requires `@gomomento/sdk` to be available at runtime for live mode.
