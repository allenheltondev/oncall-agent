import type { Hypothesis } from "./hypothesis-engine";
import { loadConfig } from "../config/env";

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

async function postSlackWebhook(url: string, text: string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${body}`);
  }
}

function formatSlackText(payload: SlackHookPayload): string {
  const lines: string[] = [];
  lines.push(`*${payload.event}* — ${payload.message}`);
  lines.push(`incident=${payload.incidentId}`);
  if (payload.severity) lines.push(`severity=${payload.severity}`);
  if (payload.service) lines.push(`service=${payload.service}`);
  if (payload.correlationId) lines.push(`correlation=${payload.correlationId}`);
  if (payload.details) lines.push(`details=${JSON.stringify(payload.details)}`);
  return lines.join(" | ");
}

export async function sendSlackHook(payload: SlackHookPayload): Promise<void> {
  const config = loadConfig();
  const webhookUrl = Bun.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(JSON.stringify({ transport: "slack.hook", mode: "stdout", ...payload }));
    return;
  }

  const text = formatSlackText(payload);
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await postSlackWebhook(webhookUrl, text);
      console.log(
        JSON.stringify({
          event: "slack.hook.delivered",
          mode: "webhook",
          channel: Bun.env.SLACK_CHANNEL ?? null,
          nodeEnv: config.nodeEnv,
          hookEvent: payload.event,
          attempt,
        }),
      );
      return;
    } catch (error) {
      lastError = error;
      await Bun.sleep(200 * attempt);
    }
  }

  console.error(
    JSON.stringify({
      event: "slack.hook.failed",
      hookEvent: payload.event,
      message: lastError instanceof Error ? lastError.message : "unknown slack delivery error",
    }),
  );
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
