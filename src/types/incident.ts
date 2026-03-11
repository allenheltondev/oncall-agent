export type IncidentSource = "cloudwatch" | "synthetic" | "scheduled-health-check";

export interface IncidentSignalV1 {
  schemaVersion: "incident.v1";
  incidentId: string;
  source: IncidentSource;
  service: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  detectedAt: string;
  correlationId?: string;
}
