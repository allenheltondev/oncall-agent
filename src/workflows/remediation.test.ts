import { describe, expect, test } from "bun:test";
import { assembleIncidentContext } from "./incident-context";
import { createRemediationProposal } from "./remediation";

describe("createRemediationProposal", () => {
  test("creates proposal with branch + PR metadata", async () => {
    const context = assembleIncidentContext({
      incidentId: "INC-9000",
      service: "api",
      evidence: { errors: [] },
    });

    const proposal = await createRemediationProposal(context, [
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
