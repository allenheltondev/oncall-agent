import type { Hypothesis } from "./hypothesis-engine";
import type { IncidentContextV1 } from "./incident-context";

export interface GuardrailDecision {
  allowed: boolean;
  reasons: string[];
}

export interface GuardrailConfig {
  maxRemediationsPerRun: number;
  denyPatchKeywords: string[];
  killSwitch: boolean;
}

let remediationCount = 0;

export function defaultGuardrailConfig(): GuardrailConfig {
  return {
    maxRemediationsPerRun: 1,
    denyPatchKeywords: ["drop table", "terraform destroy", "rm -rf"],
    killSwitch: (Bun.env.AGENT_KILL_SWITCH ?? "false").toLowerCase() === "true",
  };
}

export function evaluateRemediationGuardrails(
  context: IncidentContextV1,
  hypotheses: Hypothesis[],
  patchSummary: string,
  config = defaultGuardrailConfig(),
): GuardrailDecision {
  const reasons: string[] = [];

  if (config.killSwitch) {
    reasons.push("kill-switch-enabled");
  }

  if (remediationCount >= config.maxRemediationsPerRun) {
    reasons.push("remediation-budget-exhausted");
  }

  const lowered = patchSummary.toLowerCase();
  if (config.denyPatchKeywords.some((keyword) => lowered.includes(keyword))) {
    reasons.push("denylisted-patch-pattern");
  }

  if (!hypotheses.length || hypotheses[0]!.confidence < 0.5) {
    reasons.push("low-confidence-hypothesis");
  }

  if (context.evidence.errors.length > 2) {
    reasons.push("insufficient-reliable-evidence");
  }

  const allowed = reasons.length === 0;
  if (allowed) remediationCount += 1;

  return { allowed, reasons };
}

export function resetGuardrailCounters(): void {
  remediationCount = 0;
}
