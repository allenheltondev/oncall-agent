/**
 * Stub tool: post_slack_summary
 * Sends incident summary to the on-call Slack channel.
 */

export interface PostSlackSummaryInput {
  channel: string;
  incidentId: string;
  summary: string;
  likelyCause: string;
  recommendedNextStep: string;
}

export interface PostSlackSummaryOutput {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    metadata: {
      likely_cause: string;
      recommended_next_step: string;
    };
  };
}

export async function postSlackSummary(
  input: PostSlackSummaryInput
): Promise<{ success: boolean; output?: PostSlackSummaryOutput; error?: { code: string; message: string } }> {
  // Validate required fields
  if (!input.channel || typeof input.channel !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "channel is required and must be a string",
      },
    };
  }

  if (!input.channel.startsWith("#")) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "channel must start with #",
      },
    };
  }

  if (input.channel !== "#oncall-incidents") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid channel: only #oncall-incidents is allowed",
      },
    };
  }

  if (!input.incidentId || typeof input.incidentId !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "incidentId is required and must be a string",
      },
    };
  }

  if (!input.summary || typeof input.summary !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "summary is required and must be a string",
      },
    };
  }

  if (!input.likelyCause || typeof input.likelyCause !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "likelyCause is required and must be a string",
      },
    };
  }

  if (!input.recommendedNextStep || typeof input.recommendedNextStep !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "recommendedNextStep is required and must be a string",
      },
    };
  }

  // Mock Slack response
  return {
    success: true,
    output: {
      ok: true,
      channel: input.channel,
      ts: `${Date.now() / 1000}`,
      message: {
        text: `Incident ${input.incidentId}: ${input.summary}`,
        metadata: {
          likely_cause: input.likelyCause,
          recommended_next_step: input.recommendedNextStep,
        },
      },
    },
  };
}
