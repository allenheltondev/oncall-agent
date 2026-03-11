# SQLite storage mode (Issue #50)

Optional storage mode for durable local lifecycle data.

## Config
- `STORAGE_MODE=sqlite`
- `SQLITE_PATH=data/oncall-agent.db`

## Current schema
- `incidents`
- `governance_entries`

## Current integration
- Runtime upserts incident state transitions into `incidents`
- Governance table is available for next wiring increment

Default mode remains `json` for compatibility.
