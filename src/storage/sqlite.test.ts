import { describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { SqliteStore } from "./sqlite";

describe("SqliteStore", () => {
  test("initializes db and writes rows", async () => {
    const path = "data/test-oncall-agent.db";
    try {
      rmSync(path, { force: true });
    } catch {
      // ignore
    }

    const store = new SqliteStore(path);
    await store.init();

    store.upsertIncident({
      incidentId: "inc-sql-1",
      service: "api",
      correlationId: "corr-sql-1",
      state: "REPORT",
      timestamp: new Date().toISOString(),
    });

    store.close();
    expect(existsSync(path)).toBe(true);
  });
});
