import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export class SqliteStore {
  private db: Database | null = null;

  constructor(private readonly filePath: string) {}

  async init(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    this.db = new Database(this.filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        incident_id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        correlation_id TEXT,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS governance_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT NOT NULL,
        action TEXT NOT NULL,
        auth_decision TEXT NOT NULL,
        outcome TEXT NOT NULL,
        details_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  upsertIncident(input: {
    incidentId: string;
    service: string;
    correlationId?: string;
    state: string;
    timestamp: string;
  }): void {
    if (!this.db) throw new Error("SqliteStore not initialized");
    this.db
      .prepare(
        `INSERT INTO incidents (incident_id, service, correlation_id, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(incident_id) DO UPDATE SET
           state=excluded.state,
           correlation_id=excluded.correlation_id,
           updated_at=excluded.updated_at`,
      )
      .run(
        input.incidentId,
        input.service,
        input.correlationId ?? null,
        input.state,
        input.timestamp,
        input.timestamp,
      );
  }

  insertGovernanceEntry(input: {
    incidentId: string;
    action: string;
    authDecision: string;
    outcome: string;
    detailsJson?: string;
    timestamp: string;
  }): void {
    if (!this.db) throw new Error("SqliteStore not initialized");
    this.db
      .prepare(
        `INSERT INTO governance_entries (incident_id, action, auth_decision, outcome, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.incidentId,
        input.action,
        input.authDecision,
        input.outcome,
        input.detailsJson ?? null,
        input.timestamp,
      );
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
