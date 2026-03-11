import type { IncidentContextV1 } from "./incident-context";

export interface Hypothesis {
  id: string;
  summary: string;
  confidence: number;
  evidence: string[];
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function generateHypotheses(context: IncidentContextV1, limit = 3): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  const metricPeak = Math.max(
    ...(context.evidence.metrics?.points.map((p) => p.value) ?? [0]),
  );
  const logsText = (context.evidence.logs?.entries ?? [])
    .map((e) => e.message.toLowerCase())
    .join(" ");

  if (metricPeak >= 0.15) {
    hypotheses.push({
      id: "traffic-spike-regression",
      summary: "Recent load increase likely triggered service regression or saturation.",
      confidence: clampConfidence(0.55 + Math.min(metricPeak, 0.4)),
      evidence: [
        `metrics peak=${metricPeak}`,
        "error/latency trend increased during incident window",
      ],
    });
  }

  if (logsText.includes("timeout")) {
    hypotheses.push({
      id: "downstream-timeout",
      summary: "Downstream dependency timeout is causing cascading failures.",
      confidence: 0.84,
      evidence: ["log messages contain timeout markers"],
    });
  }

  if (context.evidence.deploy) {
    hypotheses.push({
      id: "recent-deploy-regression",
      summary: "A recent deployment likely introduced behavioral regression.",
      confidence: 0.72,
      evidence: [
        `recent deploy commit=${context.evidence.deploy.commitSha}`,
        `pipeline=${context.evidence.deploy.pipeline}`,
      ],
    });
  }

  if (hypotheses.length === 0) {
    hypotheses.push({
      id: "insufficient-evidence",
      summary: "Insufficient deterministic evidence; gather expanded telemetry.",
      confidence: 0.2,
      evidence: ["no strong logs/metrics/deploy signals available"],
    });
  }

  return hypotheses.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
}
