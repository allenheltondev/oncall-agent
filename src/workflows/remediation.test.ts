import { describe, expect, test } from "bun:test";
import { loadConfig } from "../config/env";
import { assembleIncidentContext } from "./incident-context";
import { createRemediationProposal } from "./remediation";

describe("createRemediationProposal", () => {
  test("creates proposal with branch + PR metadata", async () => {
    Bun.env.TELEPORT_PROXY = "teleport.example.com:443";
    Bun.env.TELEPORT_CLUSTER = "main";
    Bun.env.TELEPORT_MOCK_IDENTITY = "true";

    const config = await loadConfig();
    const context = assembleIncidentContext({
      incidentId: "INC-9000",
      service: "api",
      evidence: { errors: [] },
    });

    const proposal = await createRemediationProposal(config, context, [
      {
        id: "downstream-timeout",
        summary: "Dependency timeout likely root cause",
        confidence: 0.84,
        evidence: ["timeout in logs"],
      },
    ]);

    expect(proposal.branchName).toContain("agent/remediate/");
    expect(proposal.prTitle).toContain("INC-9000");
    expect(proposal.prBody).toContain("downstream-timeout");
  });
});
