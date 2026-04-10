/**
 * Tests for stub tools.
 */

import { getIncidentContext } from "../../src/tools/get-incident-context";
import { queryLogs } from "../../src/tools/query-logs";
import { queryMetrics } from "../../src/tools/query-metrics";
import { postSlackSummary } from "../../src/tools/post-slack-summary";
import { openFollowupIssue } from "../../src/tools/open-followup-issue";
import { toolRegistry, getTool, getToolNames } from "../../src/tools/index";

describe("Stub Tools", () => {
  describe("getIncidentContext", () => {
    test("returns incident data for valid incident ID", async () => {
      const result = await getIncidentContext({ incidentId: "inc-123" });
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty("incident_id", "inc-123");
      expect(result.output).toHaveProperty("title");
      expect(result.output).toHaveProperty("severity");
    });

    test("returns error for missing incident ID", async () => {
      const result = await getIncidentContext({ incidentId: "" });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("queryLogs", () => {
    test("returns logs for valid arguments", async () => {
      const result = await queryLogs({
        service: "checkout-api",
        startTime: "2026-04-08T12:00:00Z",
        endTime: "2026-04-08T13:00:00Z",
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.output)).toBe(true);
      expect(result.output?.length).toBeGreaterThan(0);
    });

    test("respects limit parameter", async () => {
      const result = await queryLogs({
        service: "checkout-api",
        startTime: "2026-04-08T12:00:00Z",
        endTime: "2026-04-08T13:00:00Z",
        limit: 3,
      });
      expect(result.success).toBe(true);
      expect(result.output?.length).toBeLessThanOrEqual(3);
    });

    test("returns error for invalid time format", async () => {
      const result = await queryLogs({
        service: "checkout-api",
        startTime: "not-a-timestamp",
        endTime: "2026-04-08T13:00:00Z",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("returns error for missing service", async () => {
      const result = await queryLogs({
        service: "",
        startTime: "2026-04-08T12:00:00Z",
        endTime: "2026-04-08T13:00:00Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("queryMetrics", () => {
    test("returns metrics for valid arguments", async () => {
      const result = await queryMetrics({
        service: "checkout-api",
        metricNames: ["cpu", "memory"],
        startTime: "2026-04-08T12:00:00Z",
        endTime: "2026-04-08T13:00:00Z",
      });
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty("cpu");
      expect(result.output).toHaveProperty("memory");
    });

    test("handles unknown metric names gracefully", async () => {
      const result = await queryMetrics({
        service: "checkout-api",
        metricNames: ["unknown_metric"],
        startTime: "2026-04-08T12:00:00Z",
        endTime: "2026-04-08T13:00:00Z",
      });
      expect(result.success).toBe(true);
      expect(result.output?.unknown_metric).toBeDefined();
    });

    test("returns error for empty metric names", async () => {
      const result = await queryMetrics({
        service: "checkout-api",
        metricNames: [],
        startTime: "2026-04-08T12:00:00Z",
        endTime: "2026-04-08T13:00:00Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("postSlackSummary", () => {
    test("succeeds for valid arguments", async () => {
      const result = await postSlackSummary({
        channel: "#oncall-incidents",
        incidentId: "inc-123",
        summary: "Payment service went down",
        likelyCause: "Memory leak in payment processor",
        recommendedNextStep: "Restart the payment service",
      });
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty("ok", true);
      expect(result.output).toHaveProperty("channel", "#oncall-incidents");
    });

    test("blocks wrong channel", async () => {
      const result = await postSlackSummary({
        channel: "#random",
        incidentId: "inc-123",
        summary: "test",
        likelyCause: "test",
        recommendedNextStep: "test",
      });
      expect(result.success).toBe(false);
    });

    test("requires all fields", async () => {
      const result = await postSlackSummary({
        channel: "#oncall-incidents",
        incidentId: "",
        summary: "test",
        likelyCause: "test",
        recommendedNextStep: "test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("openFollowupIssue", () => {
    test("creates issue for valid arguments", async () => {
      const result = await openFollowupIssue({
        title: "Review payment service architecture",
        description: "Need to investigate memory leak in payment processor",
      });
      expect(result.success).toBe(true);
      expect(result.output).toHaveProperty("id");
      expect(result.output?.id).toMatch(/^GH-\d+/);
      expect(result.output).toHaveProperty("url");
    });

    test("returns error for short title", async () => {
      const result = await openFollowupIssue({
        title: "Fix",
        description: "Need to investigate memory leak",
      });
      expect(result.success).toBe(false);
    });

    test("returns error for short description", async () => {
      const result = await openFollowupIssue({
        title: "Review memory usage",
        description: "Fix it",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Tool Registry", () => {
    test("contains all 5 tools", () => {
      expect(Object.keys(toolRegistry).length).toBe(5);
      expect(toolRegistry).toHaveProperty("get_incident_context");
      expect(toolRegistry).toHaveProperty("query_logs");
      expect(toolRegistry).toHaveProperty("query_metrics");
      expect(toolRegistry).toHaveProperty("post_slack_summary");
      expect(toolRegistry).toHaveProperty("open_followup_issue");
    });

    test("getTool returns tool by name", () => {
      const tool = getTool("query_logs");
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("query_logs");
      expect(tool?.description).toBeDefined();
    });

    test("getTool returns null for unknown tool", () => {
      const tool = getTool("unknown_tool");
      expect(tool).toBeNull();
    });

    test("getToolNames returns all tool names", () => {
      const names = getToolNames();
      expect(names).toContain("get_incident_context");
      expect(names).toContain("query_logs");
      expect(names).toContain("query_metrics");
      expect(names).toContain("post_slack_summary");
      expect(names).toContain("open_followup_issue");
    });

    test("each tool has valid input schema", () => {
      for (const tool of Object.values(toolRegistry)) {
        expect(tool.inputSchema).toHaveProperty("type", "object");
        expect(tool.inputSchema).toHaveProperty("properties");
        expect(tool.inputSchema).toHaveProperty("required");
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });
  });
});