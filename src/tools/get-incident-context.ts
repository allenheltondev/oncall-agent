/**
 * Stub tool: get_incident_context
 * Loads full incident metadata including context, timeline, and events.
 */

export interface GetIncidentContextInput {
  incidentId: string;
}

export interface GetIncidentContextOutput {
  incident_id: string;
  title: string;
  severity: string;
  service: string;
  started_at: string;
  summary: string;
  initial_context: {
    alert_source: string;
    affected_region: string;
    estimated_impact: string;
    timeline: Array<{ time: string; event: string }>;
  };
}

export async function getIncidentContext(
  input: GetIncidentContextInput
): Promise<{ success: boolean; output?: GetIncidentContextOutput; error?: { code: string; message: string } }> {
  // Validate input
  if (!input.incidentId || typeof input.incidentId !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "incidentId is required and must be a string",
      },
    };
  }

  // Mock incident data
  const mockIncident: GetIncidentContextOutput = {
    incident_id: input.incidentId,
    title: "Service degradation detected",
    severity: "SEV2",
    service: "checkout-api",
    started_at: "2026-04-08T12:00:00Z",
    summary: "Users reporting checkout failures starting at noon UTC",
    initial_context: {
      alert_source: "monitoring-platform",
      affected_region: "us-east-1",
      estimated_impact: "5% of transactions",
      timeline: [
        { time: "2026-04-08T12:00:00Z", event: "Alert fired: error_rate > 5%" },
        { time: "2026-04-08T12:05:00Z", event: "Escalated to on-call team" },
        { time: "2026-04-08T12:07:00Z", event: "Investigation started" },
      ],
    },
  };

  return {
    success: true,
    output: mockIncident,
  };
}