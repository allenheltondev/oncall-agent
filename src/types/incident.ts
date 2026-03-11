export const INCIDENT_SCHEMA_VERSION = "incident.v1" as const;

export const INCIDENT_SOURCES = [
  "cloudwatch",
  "synthetic",
  "scheduled-health-check",
] as const;

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type IncidentSource = (typeof INCIDENT_SOURCES)[number];
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export interface IncidentSignalV1 {
  schemaVersion: typeof INCIDENT_SCHEMA_VERSION;
  incidentId: string;
  source: IncidentSource;
  service: string;
  severity: IncidentSeverity;
  summary: string;
  detectedAt: string;
  correlationId?: string;
}

export function parseIncidentSignal(input: unknown): IncidentSignalV1 {
  if (!input || typeof input !== "object") {
    throw new Error("Incident payload must be an object");
  }

  const v = input as Record<string, unknown>;

  const asString = (key: string): string => {
    const value = v[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Invalid incident field: ${key}`);
    }
    return value;
  };

  const schemaVersion = asString("schemaVersion");
  if (schemaVersion !== INCIDENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported incident schemaVersion: ${schemaVersion}`);
  }

  const source = asString("source");
  if (!INCIDENT_SOURCES.includes(source as IncidentSource)) {
    throw new Error(`Unsupported incident source: ${source}`);
  }

  const severity = asString("severity");
  if (!INCIDENT_SEVERITIES.includes(severity as IncidentSeverity)) {
    throw new Error(`Unsupported incident severity: ${severity}`);
  }

  const detectedAt = asString("detectedAt");
  if (Number.isNaN(Date.parse(detectedAt))) {
    throw new Error("Invalid incident field: detectedAt must be ISO timestamp");
  }

  const correlationId = v.correlationId;
  if (correlationId !== undefined && typeof correlationId !== "string") {
    throw new Error("Invalid incident field: correlationId");
  }

  return {
    schemaVersion: INCIDENT_SCHEMA_VERSION,
    incidentId: asString("incidentId"),
    source: source as IncidentSource,
    service: asString("service"),
    severity: severity as IncidentSeverity,
    summary: asString("summary"),
    detectedAt,
    correlationId: correlationId as string | undefined,
  };
}
