import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";

export interface GovernanceLedgerEntry {
  timestamp: string;
  incidentId: string;
  correlationId?: string;
  action: string;
  identityScope: string;
  authDecision: "allow" | "deny";
  outcome: "success" | "failure";
  details?: Record<string, unknown>;
}

function ledgerPath(): string {
  return join(process.cwd(), "data", "ledger", "governance-ledger.jsonl");
}

export async function appendGovernanceEntry(entry: GovernanceLedgerEntry): Promise<string> {
  const path = ledgerPath();
  await mkdir(join(process.cwd(), "data", "ledger"), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf-8");
  return path;
}

export async function writeGovernanceSnapshot(entries: GovernanceLedgerEntry[]): Promise<string> {
  const path = join(process.cwd(), "data", "ledger", "latest-governance-snapshot.json");
  await mkdir(join(process.cwd(), "data", "ledger"), { recursive: true });
  await writeFile(path, JSON.stringify(entries, null, 2), "utf-8");
  return path;
}
