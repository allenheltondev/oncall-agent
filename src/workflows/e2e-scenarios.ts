import { loadConfig } from "../config/env";
import { parseIncidentSignal } from "../types/incident";
import { collectInvestigationEvidence } from "./investigation-adapters";
import { assembleIncidentContext, persistIncidentContext } from "./incident-context";
import { generateHypotheses } from "./hypothesis-engine";
import { createRemediationProposal } from "./remediation";
import { appendGovernanceEntry } from "./governance-ledger";

export interface E2EScenarioResult {
  incidentId: string;
  contextPath: string;
  topHypothesisId?: string;
  proposalBranch: string;
  governanceLogged: boolean;
}

export async function runE2EScenarioFromPayload(payload: unknown): Promise<E2EScenarioResult> {
  const config = loadConfig();
  const incident = parseIncidentSignal(payload);

  const evidence = await collectInvestigationEvidence(config, {
    incidentId: incident.incidentId,
    service: incident.service,
    correlationId: incident.correlationId,
  });

  const context = assembleIncidentContext({
    incidentId: incident.incidentId,
    service: incident.service,
    correlationId: incident.correlationId,
    evidence,
  });

  const contextPath = await persistIncidentContext(context);
  const hypotheses = generateHypotheses(context);
  const proposal = await createRemediationProposal(config, context, hypotheses);

  await appendGovernanceEntry({
    timestamp: new Date().toISOString(),
    incidentId: incident.incidentId,
    correlationId: incident.correlationId,
    action: "e2e.scenario",
    identityScope: "cloudwatch:read+pr:create",
    authDecision: "allow",
    outcome: "success",
    details: {
      topHypothesisId: hypotheses[0]?.id,
      branchName: proposal.branchName,
    },
  });

  return {
    incidentId: incident.incidentId,
    contextPath,
    topHypothesisId: hypotheses[0]?.id,
    proposalBranch: proposal.branchName,
    governanceLogged: true,
  };
}
