import { buildHybridGraph } from "@/lib/graphs";
import { DEFAULT_MODEL, errorResponse, readKey } from "@/lib/byok";

export const maxDuration = 60;

export async function POST(req: Request) {
  const key = readKey(req);
  if (!key) return Response.json({ error: "Add your Groq API key (🔑 top right)." }, { status: 400 });
  const { ticket, threshold = 0.6, model = DEFAULT_MODEL } = (await req.json()) as {
    ticket: string;
    threshold?: number;
    model?: string;
  };
  if (!ticket?.trim()) return Response.json({ error: "Empty ticket" }, { status: 400 });
  try {
    const started = Date.now();
    const r = await buildHybridGraph(key, model).invoke({ ticket: ticket.slice(0, 4000), threshold });
    return Response.json({
      gate: r.gate,
      route: r.route,
      output: r.output,
      trace: r.trace,
      gateUsage: r.gateUsage,
      genUsage: r.genUsage,
      ms: Date.now() - started,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
