const SECRET_KEYS = [
  "OPENAI_API_KEY",
  "SLACK_WEBHOOK_URL",
  "SLACK_TOKEN",
  "MOMENTO_API_KEY",
  "TELEPORT_ISSUER_COMMAND_AWS",
  "TELEPORT_ISSUER_COMMAND_GITHUB",
] as const;

export function maskSecret(secret?: string | null): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export function redactEnvMap(input: Record<string, string>): Record<string, string> {
  const out = { ...input };
  for (const key of SECRET_KEYS) {
    if (out[key]) out[key] = maskSecret(out[key]) ?? "****";
  }
  return out;
}
