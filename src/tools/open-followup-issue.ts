/**
 * Stub tool: open_followup_issue
 * Creates a followup ticket for deeper investigation.
 */

export interface OpenFollowupIssueInput {
  title: string;
  description: string;
}

export interface OpenFollowupIssueOutput {
  id: string;
  url: string;
  title: string;
  status: string;
}

export async function openFollowupIssue(
  input: OpenFollowupIssueInput
): Promise<{ success: boolean; output?: OpenFollowupIssueOutput; error?: { code: string; message: string } }> {
  // Validate required fields
  if (!input.title || typeof input.title !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "title is required and must be a string",
      },
    };
  }

  if (!input.description || typeof input.description !== "string") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "description is required and must be a string",
      },
    };
  }

  if (input.title.length < 5) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "title must be at least 5 characters long",
      },
    };
  }

  if (input.description.length < 10) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "description must be at least 10 characters long",
      },
    };
  }

  // Mock issue creation
  const issueId = `GH-${Math.floor(Math.random() * 10000) + 1000}`;

  return {
    success: true,
    output: {
      id: issueId,
      url: `https://github.com/allenheltondev/oncall-agent/issues/${issueId.split("-")[1]}`,
      title: input.title,
      status: "created",
    },
  };
}