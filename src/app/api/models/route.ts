import { readKey } from "@/lib/byok";

export async function GET(req: Request) {
  const key = readKey(req);
  if (!key) return Response.json({ error: "Missing or malformed Groq key (expected gsk_…)" }, { status: 400 });
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return Response.json({ error: `Groq rejected the key (${res.status})` }, { status: res.status });
  const data = (await res.json()) as { data: { id: string; active?: boolean }[] };
  const models = data.data
    .filter((m) => m.active !== false && !/whisper|tts|guard|playai|orpheus|distil/i.test(m.id))
    .map((m) => m.id)
    .sort();
  return Response.json({ models });
}
