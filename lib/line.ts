import "server-only";

type SendLineMessageOptions = {
  // Reuse the same UUID for retries of the same message and recipient.
  retryKey?: string;
};

/** Sends a text push message. Success means LINE accepted the request. */
export async function sendLineMessage(
  to: string,
  text: string,
  options: SendLineMessageOptions = {},
): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable");
  if (!to.trim()) throw new Error("LINE recipient ID is required");
  if (!text.trim()) throw new Error("LINE message text is required");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (options.retryKey) headers["X-Line-Retry-Key"] = options.retryKey;

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers,
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  // LINE returns 409 with this header when the same retry key was already accepted.
  const alreadyAccepted = response.status === 409
    && Boolean(options.retryKey)
    && Boolean(response.headers.get("x-line-accepted-request-id"));
  if (!response.ok && !alreadyAccepted) {
    const errorBody: unknown = await response.json().catch(() => null);
    const lineMessage = errorBody && typeof errorBody === "object"
      && "message" in errorBody && typeof errorBody.message === "string"
      ? errorBody.message
      : "";
    throw new Error(`LINE Messaging API request failed (HTTP ${response.status})${lineMessage ? `: ${lineMessage}` : ""}`);
  }
}
