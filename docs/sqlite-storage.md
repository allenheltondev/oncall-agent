# SQLite storage mode (Issue #50)

Optional storage mode for durable local lifecycle data.

## Config
- `STORAGE_MODE=sqlite`
- `SQLITE_PATH=data/oncall-agent.db`

## Current schema
- `incidents`

## Current integration
- Runtime upserts incident state transitions into `incidents`

Default mode remains `json` for compatibility.
