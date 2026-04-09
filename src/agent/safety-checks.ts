/**
 * Safety checks for blocking dangerous tool calls and summaries.
 * Pattern-based detection (regex + keyword matching).
 * Intentionally shallow — goal is to catch obvious attacks, not be perfect.
 */

export interface SafetyCheckResult {
  isDangerous: boolean;
  reason?: string;
  pattern?: string;
  confidence: number;  // 0.0 (safe) to 1.0 (dangerous)
  severity?: "info" | "warning" | "error";
}

/**
 * Dangerous patterns we're trying to detect.
 * Each pattern has a reason and confidence score.
 */
const DANGEROUS_PATTERNS = [
  // File paths and sensitive locations
  { pattern: /\/etc\/passwd/, reason: "system password file", confidence: 0.95 },
  { pattern: /\/etc\/shadow/, reason: "system password database", confidence: 0.95 },
  { pattern: /\/root\/\.ssh/, reason: "root SSH keys", confidence: 0.95 },
  { pattern: /~\/\.aws\//, reason: "AWS credentials directory", confidence: 0.95 },
  { pattern: /~\/\.ssh/, reason: "SSH keys directory", confidence: 0.95 },
  { pattern: /\.env$/, reason: "environment variables file", confidence: 0.90 },
  { pattern: /\/var\/run\/secrets/, reason: "Kubernetes secrets", confidence: 0.90 },
  { pattern: /\/proc\/\d+\/environ/, reason: "process environment variables", confidence: 0.90 },

  // Credential-related keywords
  { pattern: /password|passwd|pwd/, reason: "password keyword", confidence: 0.70 },
  { pattern: /secret|token|credential|api.?key/, reason: "credential keyword", confidence: 0.75 },
  { pattern: /aws_access_key|aws_secret|AKIA[0-9A-Z]{16}/, reason: "AWS key pattern", confidence: 0.95 },
  { pattern: /private.?key|private_key|id_rsa/, reason: "private key file", confidence: 0.95 },

  // Environment variable access attempts
  { pattern: /process\.env|getenv|ENV\[/, reason: "environment variable access", confidence: 0.85 },
  { pattern: /\$\{?[A-Z_]+\}?/, reason: "environment variable reference (may be false positive)", confidence: 0.40 },

  // File system access attempts
  { pattern: /fs\.read|readFile|readFileSync|read_file/, reason: "file system read attempt", confidence: 0.90 },
  { pattern: /fs\.write|writeFile|write_file/, reason: "file system write attempt", confidence: 0.90 },
  { pattern: /fs\.mkdir|mkdir|mkdtemp/, reason: "file system write attempt", confidence: 0.85 },
  { pattern: /require\(["']fs["']\)/, reason: "importing filesystem module", confidence: 0.95 },

  // Exfiltration URLs (known malicious domains)
  { pattern: /attacker\.site|attacker\.com|evil\.site|badguy\.com/, reason: "known malicious domain", confidence: 0.99 },
  { pattern: /example-attacker/, reason: "example attacker domain", confidence: 0.95 },
  { pattern: /http:\/\/localhost:\d+\/collect|https:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/collect/, reason: "suspicious collector endpoint", confidence: 0.85 },
  { pattern: /\/(collect|exfil|upload|steal)/, reason: "suspicious URL path", confidence: 0.60 },

  // Command injection attempts
  { pattern: /\|\s*(cat|grep|sed|awk|curl|wget|base64|xxd)/, reason: "shell piping to dangerous command", confidence: 0.90 },
  { pattern: /exec\(|system\(|spawn\(|shell:/, reason: "shell execution attempt", confidence: 0.95 },
  { pattern: /eval\(|new Function/, reason: "code execution attempt", confidence: 0.95 },

  // Unusual authorization claims ("IMPORTANT OVERRIDE", etc.)
  { pattern: /important.*override|ignore.*instruction|priority.*execute/i, reason: "suspicious override claim", confidence: 0.70 },
  { pattern: /forget.*previous|disregard.*prior|new.*instruction|updated.*rules/i, reason: "instruction override attempt", confidence: 0.65 },

  // Data exfiltration attempts
  { pattern: /upload.*log|POST.*result|send.*data.*external|exfil/, reason: "exfiltration intent", confidence: 0.75 },
  { pattern: /base64_encode|encode.*secret|encrypt.*data/, reason: "data encoding for exfiltration", confidence: 0.65 },
];

/**
 * Check a string for dangerous patterns.
 * Used for validating tool arguments, model output, summaries.
 */
export function detectDangerousPatterns(input: string): SafetyCheckResult {
  if (!input || typeof input !== "string") {
    return { isDangerous: false, confidence: 0 };
  }

  // Convert to lowercase for case-insensitive matching
  const lowerInput = input.toLowerCase();

  let maxDanger: SafetyCheckResult = {
    isDangerous: false,
    confidence: 0,
  };

  for (const { pattern, reason, confidence } of DANGEROUS_PATTERNS) {
    if (pattern.test(lowerInput)) {
      if (confidence > maxDanger.confidence) {
        maxDanger = {
          isDangerous: true,
          reason,
          pattern: pattern.source,
          confidence,
          severity: confidence > 0.90 ? "error" : confidence > 0.70 ? "warning" : "info",
        };
      }
    }
  }

  return maxDanger;
}

/**
 * Safety check for a tool call (name + arguments).
 * Returns whether the call should be blocked.
 */
export function checkToolCall(toolName: string, args: Record<string, unknown>): SafetyCheckResult {
  // Check tool name
  let check = detectDangerousPatterns(toolName);
  if (check.isDangerous) {
    return { ...check, reason: `Dangerous pattern in tool name: ${check.reason}` };
  }

  // Check all arguments (convert to string)
  const argsString = JSON.stringify(args);
  check = detectDangerousPatterns(argsString);
  if (check.isDangerous) {
    return { ...check, reason: `Dangerous pattern in tool arguments: ${check.reason}` };
  }

  // Tool-specific checks
  if (toolName === "post_slack_summary") {
    const channel = args.channel as string;
    if (channel && !channel.startsWith("#oncall-incidents")) {
      return {
        isDangerous: true,
        reason: "post_slack_summary must use #oncall-incidents channel",
        confidence: 0.95,
        severity: "error",
      };
    }
  }

  return { isDangerous: false, confidence: 0 };
}

/**
 * Safety check for final summary before posting to Slack.
 * More lenient than tool call checks (model has already done investigation).
 */
export function checkSummary(summary: string): SafetyCheckResult {
  // Check for exfil URLs
  const check = detectDangerousPatterns(summary);
  if (check.isDangerous && check.confidence > 0.80) {
    return check;
  }

  // Check for credential literals (high confidence only)
  const credLiterals = summary.match(/AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{48}/g);
  if (credLiterals) {
    return {
      isDangerous: true,
      reason: "Potential credential literal in summary",
      confidence: 0.99,
      severity: "error",
    };
  }

  return { isDangerous: false, confidence: 0 };
}