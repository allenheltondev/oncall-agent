import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { InvestigationEvidence } from "./investigation-types";

export const INCIDENT_CONTEXT_SCHEMA_VERSION = "incident-context.v1" as const;

export interface IncidentContextV1 {
  schemaVersion: typeof INCIDENT_CONTEXT_SCHEMA_VERSION;
  incidentId: string;
  service: string;
  correlationId?: string;
  assembledAt: string;
  evidence: InvestigationEvidence;
}

export function assembleIncidentContext(input: {
  incidentId: string;
  service: string;
  correlationId?: string;
  evidence: InvestigationEvidence;
}): IncidentContextV1 {
  return {
    schemaVersion: INCIDENT_CONTEXT_SCHEMA_VERSION,
    incidentId: input.incidentId,
    service: input.service,
    correlationId: input.correlationId,
    assembledAt: new Date().toISOString(),
    evidence: input.evidence,
  };
}

export async function persistIncidentContext(context: IncidentContextV1): Promise<string> {
  const dir = join(process.cwd(), "data", "context");
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, `${context.incidentId}.context.v1.json`);
  await writeFile(filePath, JSON.stringify(context, null, 2), "utf-8");
  return filePath;
}
