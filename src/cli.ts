import { loadConfig } from "./config/env";
import { loadIdentityMap } from "./config/identity-map";
import { startAgent } from "./agent/runtime";

interface CliOptions {
  configPath?: string;
}

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--config") {
      options.configPath = argv[i + 1];
      i += 1;
    }
  }
  return options;
}

function usage(): string {
  return [
    "oncall-agent CLI",
    "",
    "Commands:",
    "  oncall-agent config validate [--config <path>]",
    "  oncall-agent start [--config <path>]",
  ].join("\n");
}

export async function runCli(argv = Bun.argv.slice(2)): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  if (!command) {
    console.log(usage());
    return 0;
  }

  if (command === "config") {
    if (subcommand !== "validate") {
      console.error("Unknown config subcommand");
      console.log(usage());
      return 1;
    }

    const opts = parseOptions(rest);
    const map = await loadIdentityMap(opts.configPath);
    console.log(
      JSON.stringify(
        {
          ok: true,
          schemaVersion: map.schemaVersion,
          environments: map.environments.map((env) => env.name),
          configPath: opts.configPath ?? "config/identity-map.v1.json",
        },
        null,
        2,
      ),
    );
    return 0;
  }

  if (command === "start") {
    const opts = parseOptions([subcommand, ...rest].filter(Boolean) as string[]);
    await loadIdentityMap(opts.configPath); // fail fast on invalid config mapping
    const config = loadConfig();
    await startAgent(config);
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  console.log(usage());
  return 1;
}

if (import.meta.main) {
  const code = await runCli();
  process.exit(code);
}
