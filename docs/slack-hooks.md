# Slack lifecycle hooks (Issue #15)

Initial hook events implemented:
- `problem_detected`
- `working_hypothesis`
- `resolution_path_proposed`
- `resolution_outcome`

Current increment emits structured hook payloads to stdout for integration testing.
Next increment can wire actual Slack API/webhook delivery with retries and channel routing.
