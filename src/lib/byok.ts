// BYOK: the Groq key travels from the browser in a header on each request.
// It is used for that request only — never logged, persisted, or read from env.
export function readKey(req: Request): string | null {
  const key = req.headers.get("x-groq-key")?.trim();
  return key && key.startsWith("gsk_") ? key : null;
}

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = /401|invalid api key/i.test(message) ? 401 : /429|rate/i.test(message) ? 429 : 500;
  return Response.json({ error: message.slice(0, 400) }, { status });
}
