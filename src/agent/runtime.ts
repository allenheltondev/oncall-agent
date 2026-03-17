import type { AppConfig } from "../config/env";
import type { IncidentSignalV1 } from "../types/incident";
import {
  newRecord,
  transition,
  type AgentState,
  type IncidentProcessingRecord,
} from "./state-machine";
import { sendSlackHook } from "../workflows/slack-hooks";
import { runAgentLoop } from "../workflows/agent-loop";
import { startMomentoSubscriptionLoop } from "./momento-subscription";
import { SqliteStore } from "../storage/sqlite";

const TERMINAL_STATES: ReadonlySet<AgentState> = new Set(["DONE", "FAILED"]);

export class AgentRuntime {
  private readonly sqliteStore: SqliteStore | null;

  constructor(private readonly config: AppConfig) {
    this.sqliteStore =
      config.storage.mode === "sqlite" ? new SqliteStore(config.storage.sqlitePath) : null;
  }

  async init(): Promise<void> {
    await this.sqliteStore?.init();
  }

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
      await sendSlackHook({
        event: "problem_detected",
        incidentId,
        severity: record.incident.severity,
        service: record.incident.service,
        correlationId: record.incident.correlationId,
        message: `Incident detected for ${record.incident.service}`,
      });

      this.update(incidentId, "INVESTIGATE");
      const result = await runAgentLoop(this.config, record.incident);

      console.log(JSON.stringify({
        event: "incident.agent_loop.complete",
        incidentId,
        correlationId: record.incident.correlationId,
        summary: result.summary,
        hypothesis: result.hypothesis,
        remediation: result.remediation,
        prUrl: result.prUrl,
      }));

      await sendSlackHook({
        event: "resolution_outcome",
        incidentId,
        correlationId: record.incident.correlationId,
        message: result.summary,
        details: {
          hypothesis: result.hypothesis,
          remediation: result.remediation,
          prUrl: result.prUrl,
        },
      });

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

    this.sqliteStore?.upsertIncident({
      incidentId,
      service: next.incident.service,
      correlationId: next.incident.correlationId,
      state: next.state,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function startAgent(config: AppConfig): Promise<void> {
  console.log("🦞 oncall-agent booting (Bun + TypeScript)");
  console.log(`mode=local-persistent runtime=bun env=${config.nodeEnv}`);
  console.log(
    `targets: momentoTopic=${config.momento.topicName} github=${config.github.owner}/${config.github.repo}`,
  );

  const runtime = new AgentRuntime(config);
  await runtime.init();

  if (config.momento.apiKey) {
    const handle = await startMomentoSubscriptionLoop(config, runtime);

    const shutdown = async () => {
      await handle.close();
      process.exit(0);
    };

    process.once("SIGINT", () => {
      void shutdown();
    });
    process.once("SIGTERM", () => {
      void shutdown();
    });

    await new Promise(() => {
      // Keep process alive while subscription loop runs.
    });
    return;
  }

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
