import { buildAssistantGraph, type ChatTurn } from "@/lib/graphs";
import { DEFAULT_MODEL, errorResponse, readKey } from "@/lib/byok";

export const maxDuration = 60;

export async function POST(req: Request) {
  const key = readKey(req);
  if (!key) return Response.json({ error: "Add your Groq API key (🔑 top right)." }, { status: 400 });
  const { question, history = [], model = DEFAULT_MODEL } = (await req.json()) as {
    question: string;
    history?: ChatTurn[];
    model?: string;
  };
  if (!question?.trim()) return Response.json({ error: "Empty question" }, { status: 400 });
  try {
    const started = Date.now();
    const result = await buildAssistantGraph(key, model).invoke({ question: question.slice(0, 4000), history });
    return Response.json({
      answer: result.answer,
      code: result.code ?? "",
      intent: result.intent,
      trace: result.trace,
      usage: result.usage,
      ms: Date.now() - started,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
