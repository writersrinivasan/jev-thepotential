import { ChatGroq } from "@langchain/groq";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { AIMessage } from "@langchain/core/messages";
import { KNOWLEDGE, retrieve } from "./knowledge";

export type TraceStep = { node: string; detail: string; ms: number; tokens?: number };
export type Usage = { input: number; output: number; calls: number };
export type ChatTurn = { role: "user" | "assistant"; content: string };

const ZERO: Usage = { input: 0, output: 0, calls: 0 };
const addUsage = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  calls: a.calls + b.calls,
});

function makeModel(apiKey: string, model: string, temperature = 0.3, maxTokens = 1200) {
  return new ChatGroq({ apiKey, model, temperature, maxTokens });
}

async function call(llm: ChatGroq, system: string, user: string) {
  const res = (await llm.invoke([
    ["system", system],
    ["user", user],
  ])) as AIMessage;
  const u = res.usage_metadata;
  const usage: Usage = { input: u?.input_tokens ?? 0, output: u?.output_tokens ?? 0, calls: 1 };
  return { text: typeof res.content === "string" ? res.content : JSON.stringify(res.content), usage };
}

function parseJson<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    return { ...fallback, ...JSON.parse(match[0]) };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Graph 1: the JEV Assistant (router -> retrieve -> answer -> code)   */
/* ------------------------------------------------------------------ */

const INTENTS = ["concept", "implementation", "usecase", "comparison", "cost", "offtopic"] as const;
type Intent = (typeof INTENTS)[number];

const AssistantState = Annotation.Root({
  question: Annotation<string>(),
  history: Annotation<ChatTurn[]>(),
  intent: Annotation<Intent>(),
  wantsCode: Annotation<boolean>(),
  context: Annotation<string>(),
  answer: Annotation<string>(),
  code: Annotation<string>(),
  trace: Annotation<TraceStep[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  usage: Annotation<Usage>({ reducer: addUsage, default: () => ZERO }),
});

export function buildAssistantGraph(apiKey: string, model: string) {
  const fast = makeModel(apiKey, model, 0, 120);
  const writer = makeModel(apiKey, model, 0.4, 1400);

  const graph = new StateGraph(AssistantState)
    // Router node. In production this is exactly the kind of decision you would hand to JEV.
    .addNode("classify", async (s) => {
      const t = Date.now();
      const { text, usage } = await call(
        fast,
        `You classify questions about "JEV" (TypeSafe AI's non-generative decision model) for a learning app.
Return ONLY JSON: {"intent": one of ${JSON.stringify(INTENTS)}, "wantsCode": boolean}.
"implementation" = how/where to build/integrate; "usecase" = industries/applications; "comparison" = JEV vs LLM/other techniques;
"cost" = tokens/pricing/latency; "concept" = what it is/how it works; "offtopic" = unrelated to JEV, LLMs, or AI systems.
wantsCode = true if the user asks for code, an example, SDK usage, or integration snippet.`,
        s.question,
      );
      const parsed = parseJson(text, { intent: "concept" as Intent, wantsCode: false });
      const intent = INTENTS.includes(parsed.intent) ? parsed.intent : "concept";
      return {
        intent,
        wantsCode: Boolean(parsed.wantsCode),
        trace: [{ node: "classify", detail: `intent=${intent}, wantsCode=${parsed.wantsCode}`, ms: Date.now() - t, tokens: usage.input + usage.output }],
        usage,
      };
    })
    .addNode("retrieve", async (s) => {
      const t = Date.now();
      const tagMap: Record<Intent, string[]> = {
        concept: ["concept"],
        implementation: ["implementation"],
        usecase: ["usecase"],
        comparison: ["comparison", "concept"],
        cost: ["cost", "comparison"],
        offtopic: [],
      };
      const sections = retrieve(tagMap[s.intent], 5);
      const always = KNOWLEDGE.find((k) => k.id === "what")!;
      const chosen = sections.some((x) => x.id === "what") ? sections : [always, ...sections];
      return {
        context: chosen.map((c) => `## ${c.title}\n${c.body}`).join("\n\n"),
        trace: [{ node: "retrieve", detail: `sections: ${chosen.map((c) => c.id).join(", ")}`, ms: Date.now() - t, tokens: 0 }],
      };
    })
    .addNode("answer", async (s) => {
      const t = Date.now();
      const history = s.history.slice(-6).map((h) => `${h.role.toUpperCase()}: ${h.content}`).join("\n");
      const { text, usage } = await call(
        writer,
        `You are the JEV Explorer assistant: an expert in TypeSafe AI's JEV ("System One") decision model, LLM systems,
LangGraph, and token/cost optimisation. Ground your answer in the CONTEXT. If a fact is not in context, say it is your
general understanding. Flag vendor-reported numbers as such. Be practical: give concrete steps, thresholds, and trade-offs.
Use markdown with short headings and bullet lists. Do not include large code blocks — a separate step handles code.

CONTEXT:
${s.context}`,
        `${history ? `Conversation so far:\n${history}\n\n` : ""}Question: ${s.question}`,
      );
      return {
        answer: text,
        trace: [{ node: "answer", detail: `grounded on ${s.context.split("## ").length - 1} sections`, ms: Date.now() - t, tokens: usage.input + usage.output }],
        usage,
      };
    })
    .addNode("codegen", async (s) => {
      const t = Date.now();
      const api = KNOWLEDGE.find((k) => k.id === "api")!.body;
      const { text, usage } = await call(
        writer,
        `You write concise, production-quality TypeScript or Python examples for integrating JEV.
API reference (verify field names against docs.typesafe.ai/api):
${api}
Prefer plain fetch / LangGraph JS when the user does not specify. Include thresholds and a fallback path. Return ONE fenced code block plus at most 3 bullet notes.`,
        `User question: ${s.question}\n\nExplanation already given:\n${s.answer.slice(0, 1500)}`,
      );
      return {
        code: text,
        trace: [{ node: "codegen", detail: "generated integration snippet", ms: Date.now() - t, tokens: usage.input + usage.output }],
        usage,
      };
    })
    .addNode("redirect", async () => ({
      answer:
        "That looks outside this app's scope. I can help with **JEV** — what it is, how its Choice/Score/Noul primitives work, where to place it next to LLMs, industrial use cases, and token/cost optimisation. Try: *\"Where should JEV sit in a customer-support LangGraph?\"*",
      trace: [{ node: "redirect", detail: "off-topic, no generation spent", ms: 0, tokens: 0 }],
    }))
    .addEdge(START, "classify")
    .addConditionalEdges("classify", (s) => (s.intent === "offtopic" ? "redirect" : "retrieve"), ["redirect", "retrieve"])
    .addEdge("retrieve", "answer")
    .addConditionalEdges("answer", (s) => (s.wantsCode ? "codegen" : END), ["codegen", END])
    .addEdge("codegen", END)
    .addEdge("redirect", END);

  return graph.compile();
}

/* ------------------------------------------------------------------ */
/* Graph 2: Hybrid "bridge" lab — JEV-style gate in front of an LLM    */
/* ------------------------------------------------------------------ */

export const TEAMS = ["billing", "technical", "account", "sales", "spam"] as const;
export const URGENCY = ["low", "normal", "high", "critical"] as const;

export type GateAnswers = {
  team: { choice: string; probabilities: Record<string, number>; confidence: number };
  urgency: { score: number; probabilities: Record<string, number>; legend: readonly string[] };
  needsWrittenReply: { noul: number };
  refundRequest: { noul: number };
};

const HybridState = Annotation.Root({
  ticket: Annotation<string>(),
  threshold: Annotation<number>(),
  gate: Annotation<GateAnswers>(),
  route: Annotation<"auto" | "llm" | "human">(),
  output: Annotation<string>(),
  trace: Annotation<TraceStep[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  gateUsage: Annotation<Usage>({ reducer: addUsage, default: () => ZERO }),
  genUsage: Annotation<Usage>({ reducer: addUsage, default: () => ZERO }),
});

function normalise(raw: Record<string, unknown>, keys: readonly string[]) {
  const vals = keys.map((k) => Math.max(0, Number(raw?.[k]) || 0));
  const sum = vals.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(keys.map((k, i) => [k, +(vals[i] / sum).toFixed(3)]));
}

export function buildHybridGraph(apiKey: string, model: string) {
  const gateModel = makeModel(apiKey, model, 0, 220);
  const writer = makeModel(apiKey, model, 0.5, 500);

  const graph = new StateGraph(HybridState)
    .addNode("jevGate", async (s) => {
      const t = Date.now();
      // Simulation: Groq emulates JEV's typed output. Swap this node for a POST to
      // https://api.typesafe.ai/v1/systemone in production (see the Implement tab).
      const { text, usage } = await call(
        gateModel,
        `You emulate a calibrated decision model. Output ONLY compact JSON, no prose:
{"team":{${TEAMS.map((t) => `"${t}":p`).join(",")}},"urgency":{${URGENCY.map((u) => `"${u}":p`).join(",")}},"needsWrittenReply":p,"refundRequest":p}
Each p is a probability 0..1. team and urgency distributions sum to 1. Be honestly calibrated: ambiguous tickets get spread-out probabilities.
needsWrittenReply = does resolving this need a personalised written response (vs. a standard action/link)?`,
        s.ticket,
      );
      const raw = parseJson<Record<string, unknown>>(text, {});
      const teamP = normalise(raw.team as Record<string, unknown>, TEAMS);
      const urgP = normalise(raw.urgency as Record<string, unknown>, URGENCY);
      const [team, conf] = Object.entries(teamP).sort((a, b) => b[1] - a[1])[0];
      const score = +URGENCY.reduce((acc, u, i) => acc + i * urgP[u], 0).toFixed(2);
      const gate: GateAnswers = {
        team: { choice: team, probabilities: teamP, confidence: conf },
        urgency: { score, probabilities: urgP, legend: URGENCY },
        needsWrittenReply: { noul: Math.min(1, Math.max(0, Number(raw.needsWrittenReply) || 0)) },
        refundRequest: { noul: Math.min(1, Math.max(0, Number(raw.refundRequest) || 0)) },
      };
      return {
        gate,
        trace: [{ node: "jevGate", detail: `team=${team} (${(conf * 100).toFixed(0)}%), urgency=${score}/3, reply?=${gate.needsWrittenReply.noul.toFixed(2)}`, ms: Date.now() - t, tokens: usage.input + usage.output }],
        gateUsage: usage,
      };
    })
    .addNode("router", async (s) => {
      const g = s.gate;
      const critical = g.urgency.score >= 2.5;
      const route: "auto" | "llm" | "human" =
        g.team.confidence < s.threshold || (critical && g.refundRequest.noul > 0.5)
          ? "human"
          : g.team.choice === "spam" || g.needsWrittenReply.noul < 0.5
            ? "auto"
            : "llm";
      const why =
        route === "human"
          ? g.team.confidence < s.threshold
            ? `confidence ${(g.team.confidence * 100).toFixed(0)}% < threshold ${(s.threshold * 100).toFixed(0)}%`
            : "critical refund → human"
          : route === "auto"
            ? "no personalised reply needed → deterministic action"
            : "confident + needs written reply → spend LLM tokens";
      return { route, trace: [{ node: "router", detail: `${route}: ${why}`, ms: 0, tokens: 0 }] };
    })
    .addNode("autoResolve", async (s) => {
      const g = s.gate;
      const output =
        g.team.choice === "spam"
          ? "🗑️ Marked as spam and closed. No generation spent."
          : `✅ Auto-routed to **${g.team.choice}** queue with priority **${URGENCY[Math.round(g.urgency.score)]}**. Sent standard help-centre macro for "${g.team.choice}". No generation spent.`;
      return { output, trace: [{ node: "autoResolve", detail: "template action, 0 tokens", ms: 0, tokens: 0 }] };
    })
    .addNode("llmDraft", async (s) => {
      const t = Date.now();
      const { text, usage } = await call(
        writer,
        `You are a concise, empathetic support agent on the ${s.gate.team.choice} team. Draft a reply (max 120 words). Urgency: ${URGENCY[Math.round(s.gate.urgency.score)]}.`,
        s.ticket,
      );
      return { output: text, trace: [{ node: "llmDraft", detail: "LLM drafted personalised reply", ms: Date.now() - t, tokens: usage.input + usage.output }], genUsage: usage };
    })
    .addNode("humanReview", async (s) => ({
      output: `🧑‍💼 Escalated to a human reviewer. Suggested queue: **${s.gate.team.choice}** (low confidence or high-risk). Probabilities attached for the reviewer.`,
      trace: [{ node: "humanReview", detail: "escalated with probabilities", ms: 0, tokens: 0 }],
    }))
    .addEdge(START, "jevGate")
    .addEdge("jevGate", "router")
    .addConditionalEdges(
      "router",
      (s) => (s.route === "auto" ? "autoResolve" : s.route === "llm" ? "llmDraft" : "humanReview"),
      ["autoResolve", "llmDraft", "humanReview"],
    )
    .addEdge("autoResolve", END)
    .addEdge("llmDraft", END)
    .addEdge("humanReview", END);

  return graph.compile();
}
