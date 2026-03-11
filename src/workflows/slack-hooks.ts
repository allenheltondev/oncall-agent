import type { Hypothesis } from "./hypothesis-engine";

export type SlackHookEvent =
  | "problem_detected"
  | "working_hypothesis"
  | "resolution_path_proposed"
  | "resolution_outcome";

export interface SlackHookPayload {
  event: SlackHookEvent;
  incidentId: string;
  severity?: string;
  service?: string;
  correlationId?: string;
  message: string;
  details?: Record<string, unknown>;
}

export async function sendSlackHook(payload: SlackHookPayload): Promise<void> {
  // Placeholder transport for #15: print structured payload.
  // Follow-up increment can post through real Slack API/webhook.
  console.log(JSON.stringify({ transport: "slack.hook", ...payload }));
}

export function buildHypothesisHook(params: {
  incidentId: string;
  correlationId?: string;
  topHypothesis?: Hypothesis;
}): SlackHookPayload {
  const top = params.topHypothesis;
  return {
    event: "working_hypothesis",
    incidentId: params.incidentId,
    correlationId: params.correlationId,
    message: top
      ? `Top hypothesis: ${top.id} (confidence ${top.confidence})`
      : "No strong hypothesis available yet",
    details: top
      ? {
          hypothesisId: top.id,
          confidence: top.confidence,
          evidence: top.evidence,
        }
      : undefined,
  };
}
