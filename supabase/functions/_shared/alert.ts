/**
 * Slack alerting helper for edge function errors.
 *
 * Usage:
 *   import { alertError } from "../_shared/alert.ts";
 *   await alertError("my-function", error, { orderId, userId });
 *
 * Never throws — always fire-and-forget so alerts never break the main flow.
 */

const SEVERITY_EMOJI: Record<string, string> = {
  critical: ":rotating_light:",
  error: ":red_circle:",
  warning: ":warning:",
};

export async function alertError(
  functionName: string,
  error: unknown,
  context: Record<string, unknown> = {},
  severity: "critical" | "error" | "warning" = "error",
): Promise<void> {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return;

  const emoji = SEVERITY_EMOJI[severity];
  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === "string"
    ? error
    : JSON.stringify(error);

  const stack = error instanceof Error && error.stack
    ? error.stack.split("\n").slice(0, 4).join("\n")
    : null;

  // Build context lines (filter out undefined/null values)
  const contextLines = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `*${k}:* \`${v}\``);

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} Edge Function Failure`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Function*\n\`${functionName}\`` },
        { type: "mrkdwn", text: `*Severity*\n${severity.toUpperCase()}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error*\n\`\`\`${errorMessage}\`\`\``,
      },
    },
  ];

  if (contextLines.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: contextLines.join("   |   "),
      },
    });
  }

  if (stack) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Stack*\n\`\`\`${stack}\`\`\``,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>  •  spice-and-slice`,
      },
    ],
  });

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch {
    // Intentionally swallow — alerting must never break the function
  }
}
