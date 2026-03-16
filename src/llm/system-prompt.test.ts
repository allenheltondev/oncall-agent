import { describe, expect, test } from "bun:test";
import { ONCALL_AGENT_SYSTEM_PROMPT } from "./system-prompt";

describe("ONCALL_AGENT_SYSTEM_PROMPT", () => {
  test("is a string and contains key sections", () => {
    expect(typeof ONCALL_AGENT_SYSTEM_PROMPT).toBe("string");
    expect(ONCALL_AGENT_SYSTEM_PROMPT).toContain("oncall-agent");
    expect(ONCALL_AGENT_SYSTEM_PROMPT).toContain("Instructions:");
    expect(ONCALL_AGENT_SYSTEM_PROMPT).toContain("Steps:");
    expect(ONCALL_AGENT_SYSTEM_PROMPT).toContain("End Goal:");
    expect(ONCALL_AGENT_SYSTEM_PROMPT).toContain("Narrowing:");
  });
});
