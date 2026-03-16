import { startAgent } from "./agent/runtime";
import { loadConfig } from "./config/env";

const config = await loadConfig();
await startAgent(config);
