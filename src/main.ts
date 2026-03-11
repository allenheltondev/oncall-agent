import { startAgent } from "./agent/runtime";
import { loadConfig } from "./config/env";

const config = loadConfig();
await startAgent(config);
