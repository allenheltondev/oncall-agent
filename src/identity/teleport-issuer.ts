export async function runTeleportIssuer<TRequest, TResponse>(
  command: string,
  request: TRequest,
): Promise<TResponse> {
  const proc = Bun.spawn([command], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const payload = JSON.stringify(request);
  proc.stdin.write(payload);
  proc.stdin.end();

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(`Teleport issuer command failed (${code}): ${stderr || stdout}`);
  }

  try {
    return JSON.parse(stdout) as TResponse;
  } catch {
    throw new Error("Teleport issuer command did not return valid JSON");
  }
}
