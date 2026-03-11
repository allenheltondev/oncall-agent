import type { LlmTaskType } from "./types";

const TEMPLATES: Record<LlmTaskType, string> = {
  incident_analysis:
    "Analyze this incident context and extract likely operational causes with concise reasoning.\n\n{{context}}",
  hypothesis_explanation:
    "Explain the top hypothesis for an engineer in 3-5 bullets with confidence rationale.\n\n{{hypotheses}}",
  remediation_text:
    "Draft a safe remediation proposal summary and operator-facing risk notes.\n\n{{context}}\n\n{{hypotheses}}",
  status_summary:
    "Summarize current incident status and next action for Slack update.\n\n{{state}}",
};

export function renderPrompt(
  taskType: LlmTaskType,
  variables: Record<string, string>,
): string {
  let prompt = TEMPLATES[taskType];
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replaceAll(`{{${key}}}`, value);
  }
  return prompt;
}
