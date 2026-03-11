import type { IncidentSignalV1 } from "../types/incident";

export const AGENT_STATES = [
  "RECEIVED",
  "AUTH",
  "INVESTIGATE",
  "REPORT",
  "DONE",
  "FAILED",
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

export interface IncidentProcessingRecord {
  incident: IncidentSignalV1;
  state: AgentState;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

export function transition(
  record: IncidentProcessingRecord,
  nextState: AgentState,
  error?: string,
): IncidentProcessingRecord {
  const now = new Date().toISOString();
  return {
    ...record,
    state: nextState,
    updatedAt: now,
    error,
  };
}

export function newRecord(incident: IncidentSignalV1): IncidentProcessingRecord {
  const now = new Date().toISOString();
  return {
    incident,
    state: "RECEIVED",
    startedAt: now,
    updatedAt: now,
  };
}
