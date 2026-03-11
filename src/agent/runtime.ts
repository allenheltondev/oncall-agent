import type { AppConfig } from "../config/env";
import type { IncidentSignalV1 } from "../types/incident";
import {
  newRecord,
  transition,
  type AgentState,
  type IncidentProcessingRecord,
} from "./state-machine";
import { requestAwsRuntimeAccess } from "../identity/teleport-aws";
import { collectInvestigationEvidence } from "../workflows/investigation-adapters";
import {
  assembleIncidentContext,
  persistIncidentContext,
} from "../workflows/incident-context";
import { generateHypotheses } from "../workflows/hypothesis-engine";
import { createRemediationProposal } from "../workflows/remediation";
import { appendGovernanceEntry } from "../workflows/governance-ledger";

const TERMINAL_STATES: ReadonlySet<AgentState> = new Set(["DONE", "FAILED"]);

export class AgentRuntime {
  constructor(private readonly config: AppConfig) {}

  private readonly queue: IncidentSignalV1[] = [];
  private readonly seenIncidentIds = new Set<string>();
  private readonly records = new Map<string, IncidentProcessingRecord>();

  enqueue(incident: IncidentSignalV1): boolean {
    if (this.seenIncidentIds.has(incident.incidentId)) {
      return false;
    }

    this.seenIncidentIds.add(incident.incidentId);
    this.queue.push(incident);
    this.records.set(incident.incidentId, newRecord(incident));
    return true;
  }

  getRecord(incidentId: string): IncidentProcessingRecord | undefined {
    return this.records.get(incidentId);
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const incident = this.queue.shift();
      if (!incident) continue;

      await this.processIncident(incident.incidentId);
    }
  }

  private async processIncident(incidentId: string): Promise<void> {
    const record = this.records.get(incidentId);
    if (!record || TERMINAL_STATES.has(record.state)) {
      return;
    }

    try {
      this.update(incidentId, "AUTH");
      await requestAwsRuntimeAccess(this.config, {
        scope: "cloudwatch:read",
        reason: `incident:${record.incident.incidentId}`,
      });
      await appendGovernanceEntry({
        timestamp: new Date().toISOString(),
        incidentId,
        correlationId: record.incident.correlationId,
        action: "identity.request.aws",
        identityScope: "cloudwatch:read",
        authDecision: "allow",
        outcome: "success",
      });

      this.update(incidentId, "INVESTIGATE");
      const evidence = await collectInvestigationEvidence(this.config, {
        incidentId: record.incident.incidentId,
        service: record.incident.service,
        correlationId: record.incident.correlationId,
      });

      const context = assembleIncidentContext({
        incidentId: record.incident.incidentId,
        service: record.incident.service,
        correlationId: record.incident.correlationId,
        evidence,
      });
      const contextPath = await persistIncidentContext(context);
      const hypotheses = generateHypotheses(context);

      console.log(
        JSON.stringify({
          event: "incident.investigation.evidence",
          incidentId,
          correlationId: record.incident.correlationId,
          hasLogs: Boolean(evidence.logs),
          hasMetrics: Boolean(evidence.metrics),
          hasDeploy: Boolean(evidence.deploy),
          errorCount: evidence.errors.length,
          contextPath,
        }),
      );

      console.log(
        JSON.stringify({
          event: "incident.hypotheses.generated",
          incidentId,
          correlationId: record.incident.correlationId,
          count: hypotheses.length,
          top: hypotheses[0],
        }),
      );

      this.update(incidentId, "REPORT");

      const proposal = await createRemediationProposal(this.config, context, hypotheses);
      await appendGovernanceEntry({
        timestamp: new Date().toISOString(),
        incidentId,
        correlationId: record.incident.correlationId,
        action: "remediation.proposal",
        identityScope: "pr:create",
        authDecision: "allow",
        outcome: "success",
        details: {
          branchName: proposal.branchName,
          prTitle: proposal.prTitle,
        },
      });
      console.log(
        JSON.stringify({
          event: "incident.remediation.proposal",
          incidentId,
          correlationId: record.incident.correlationId,
          branchName: proposal.branchName,
          prTitle: proposal.prTitle,
          patchSummary: proposal.patchSummary,
        }),
      );

      this.update(incidentId, "DONE");
    } catch (error) {
      this.update(
        incidentId,
        "FAILED",
        error instanceof Error ? error.message : "Unknown processing error",
      );
    }
  }

  private update(incidentId: string, nextState: AgentState, error?: string): void {
    const record = this.records.get(incidentId);
    if (!record) return;

    const next = transition(record, nextState, error);
    this.records.set(incidentId, next);

    console.log(
      JSON.stringify({
        event: "incident.state.transition",
        incidentId,
        state: next.state,
        correlationId: next.incident.correlationId,
        error: next.error,
      }),
    );
  }
}

export async function startAgent(config: AppConfig): Promise<void> {
  console.log("🦞 oncall-agent booting (Bun + TypeScript)");
  console.log(`mode=local-persistent runtime=bun env=${config.nodeEnv}`);
  console.log(
    `targets: momentoTopic=${config.momento.topicName} github=${config.github.owner}/${config.github.repo}`,
  );

  const runtime = new AgentRuntime(config);
  const accepted = runtime.enqueue({
    schemaVersion: "incident.v1",
    incidentId: "startup-healthcheck",
    source: "scheduled-health-check",
    service: "oncall-agent",
    severity: "low",
    summary: "Startup self-check incident",
    detectedAt: new Date().toISOString(),
    correlationId: "corr-startup-healthcheck",
  });

  if (accepted) {
    await runtime.drain();
  }
}
