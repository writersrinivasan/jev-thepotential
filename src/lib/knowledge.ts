// Curated JEV knowledge base. Powers both the UI sections and the
// grounding context the LangGraph assistant retrieves from.
// Facts reflect public sources as of Oct 2026; performance/pricing figures are vendor-reported.

export type KnowledgeSection = {
  id: string;
  title: string;
  tags: string[];
  body: string;
};

export const KNOWLEDGE: KnowledgeSection[] = [
  {
    id: "what",
    title: "What JEV is",
    tags: ["concept", "comparison"],
    body: `JEV is TypeSafe AI's "System One" model (public launch Sept 2026; company founded 2024, ~$40M raised).
It is transformer-based but NOT an LLM: it never generates text. Given a "state" (text or JSON) and a set of
pre-declared questions, it returns typed, calibrated answers in a single parallel forward pass.
Mental model: a transformer backbone with a decision head instead of a language-model head (architecture not
officially disclosed). Named after the "System 1" (fast, intuitive) vs "System 2" (slow, deliberate) framing:
JEV = fast calibrated judgment, LLM = slow open-ended reasoning and generation.`,
  },
  {
    id: "primitives",
    title: "The three primitives: Choice, Score, Noul",
    tags: ["concept", "implementation"],
    body: `Choice: pick one option from a fixed set (up to 255 options). Returns choice + probabilities per option + confidence. Use for routing, classification, triage.
Score: place input on an ordered rubric (2..10 levels, low->high). Returns an expected value (can be fractional, e.g. 2.4), probabilities, legend, confidence. Use for severity, urgency, quality, tone.
Noul: a yes/no question. Returns the probability that the answer is "yes" (0..1). No separate confidence field — 0.5 means "uncertain", NOT "moderately yes".
Rule of thumb: choose the type by how your code will branch on the result.`,
  },
  {
    id: "how",
    title: "How it works under the hood",
    tags: ["concept", "implementation"],
    body: `Autoregressive LLMs emit one token per forward pass, so a decision costs N passes plus output-token billing plus parsing.
JEV evaluates all candidate answers in ONE forward pass and returns numbers, so there are no output tokens, no parsing, and no "hallucinated label" outside your option set.
Training: synthetic data only, with RLCD (Reinforcement Learning for Calibrated Decisions). RLHF optimises human preference, RLVR optimises verifiable correctness, RLCD optimises calibration with proper scoring rules (log-loss, Brier score) — the confidence value itself is the product.
Many questions against the same state can be batched in one request; extra questions add little latency.`,
  },
  {
    id: "api",
    title: "API shape",
    tags: ["implementation"],
    body: `Endpoint: POST https://api.typesafe.ai/v1/systemone, Authorization: Bearer $TYPESAFE_API_KEY.
Body: { model: "jev-latest" | "jev-1.13.0", state: <string|object>, questions: { <id>: { type: "choice"|"score"|"noul", instructions: string, criteria?: ... } } }.
Response: { model: "jev-1.13.0", answers: { <id>: {choice, probabilities, confidence} | {score, probabilities, legend, confidence} | {noul} }, usage: {input_tokens, output_tokens} }.
SDKs: Python "typesafe-sdk"; JS/TS "@typesafe-ai/sdk" (Node 20+/Bun) with helpers choice(), score(), noul(), systemOne(); answer keys are typed literal unions so typos fail at compile time.
Also usable through promptfoo ("typesafe:jev-latest" provider) as a cheap grader/classifier. Always verify exact field names against docs.typesafe.ai/api.`,
  },
  {
    id: "limits",
    title: "Limits & pricing",
    tags: ["cost", "implementation"],
    body: `Pricing (vendor): ~$0.042 per 1M input tokens, output free (it produces none). Typical LLM input is $0.20–$10/1M with output ~5x input.
Latency (vendor/independent): 70–500 ms end to end; one independent test measured ~298 ms median for 3 questions from Toronto (network setup alone 25–113 ms).
Vendor claims up to ~194x faster and ~445x cheaper than LLM alternatives; benchmark references were averages of frontier LLM answers and workflows were written by TypeSafe, so treat as agreement-with-LLMs, not ground truth.
Context: ~64k per request; state + longest question must fit in ~32k. Reported rate limits ~250k tokens/s, ~1,200 req/min (subject to change). Text only — no images. No per-customer fine-tuning.`,
  },
  {
    id: "where",
    title: "Where to place JEV in your architecture",
    tags: ["implementation", "usecase"],
    body: `1) Front gate / router: classify every incoming request and route to cheap model, frontier model, tool, or human (LangChain evaluated this for model routing).
2) Guardrail around agents: rate each proposed tool call deny/ask/allow; flag jailbreaks in traces (Vercel replaced an LLM command-safety classifier: 5–18x faster, more accurate).
3) Inside LangGraph conditional edges: the edge function calls JEV instead of an LLM to decide the next node.
4) Evaluation / grading: LLM-as-judge replacement for rubric scoring in CI (promptfoo provider).
5) Pre/post filters: is this relevant? does this answer cite the doc? does this PII exist? — before you pay for generation.
It belongs in the decision layer, never in the generation layer.`,
  },
  {
    id: "usecases",
    title: "Industrial use cases",
    tags: ["usecase"],
    body: `Customer support: ticket triage (team = Choice), urgency (Score), "refund request?" (Noul); only escalate to LLM to draft replies.
Email/ops: Bryo AI email triage — Gemini slightly more accurate but 10–20x more expensive; Bryo valued real probabilities.
DevOps / security: shell-command safety classification (Vercel), PR risk scoring, alert dedup/severity.
Agent platforms: tool-call permissioning, jailbreak detection in traces, "is the task done?" checks in loops.
Fintech / insurance: transaction risk flags, claim category, document-type routing (with human review for low confidence; probabilities are not explanations, so audit is hard).
Content & trust-safety: moderation labels, spam, policy-violation probabilities at high QPS.
E-commerce: query intent, product taxonomy mapping (≤255 classes per question; chain hierarchical choices beyond that), review sentiment.
Healthcare/legal intake: routing to specialist queues — never as the final decision-maker.
Data pipelines: cheap labelling, filtering of scraped corpora, dedup "same entity?" Noul questions.`,
  },
  {
    id: "vs",
    title: "Is it an LLM alternative, another technique, or a bridge?",
    tags: ["comparison", "cost", "usecase"],
    body: `Verdict: it is a COMPLEMENT and a BRIDGE, not a replacement.
- Not an alternative: it cannot write text, code, explanations, or do multi-step reasoning; context is ~32k vs 1M for frontier LLMs.
- A different technique: it is closest to a calibrated, zero-shot, instruction-following classifier — the ML "classifier head" idea, made promptable.
- A bridge for token optimisation: put JEV in front of / around LLMs so you only spend output tokens when generation is actually needed. Typical savings come from (a) no output tokens for decisions, (b) routing easy cases to small models, (c) skipping generation for requests that need only a label, (d) batching many questions per state.
Analogy: JEV is the reflex, the LLM is the deliberation. A good system uses reflexes for 70–90% of decisions.`,
  },
  {
    id: "nuances",
    title: "Nuances & gotchas",
    tags: ["implementation", "concept"],
    body: `- Literal reading: it answers exactly what you asked; missing context in instructions -> wrong answers.
- Keep questions atomic; avoid negation and multi-step questions. Combine atomic answers in code with weights.
- Irrelevant context hurts: filter the state; send structured JSON and reference fields by path.
- No arithmetic/date math/counting at scale: in one test, counting accuracy degraded past ~16 items. Ask one Noul per item and sum in code.
- Cross-type inconsistency: the same judgment via Choice vs Noul gives different numbers; yes/no pairs need not sum to 1; thresholds do not transfer between types.
- Language: lower confidence on ambiguous non-English input (Korean example) — calibrate thresholds per language.
- Confidently wrong is possible: set per-action thresholds by cost of error; route low confidence to humans.
- Pin model versions (jev-1.13.0) when thresholds matter; jev-latest can drift.
- Inputs are not treated as adversarial: keep a separate prompt-injection defence.
- "Cannot hallucinate" applies to the label space, not to truth.`,
  },
  {
    id: "steps",
    title: "Practical implementation playbook",
    tags: ["implementation"],
    body: `1) Inventory decisions in your LLM pipeline: every place you parse an LLM output into an enum/bool/number is a JEV candidate.
2) Write atomic questions (Choice/Score/Noul) with explicit criteria descriptions.
3) Build a labelled eval set (200–1,000 real examples). Measure accuracy AND calibration (reliability diagram, Brier).
4) Pick thresholds per action by cost of error: auto-act above t_high, human/LLM fallback between, reject below t_low.
5) Shadow-run JEV beside the existing LLM for 1–2 weeks; compare agreement, latency, cost.
6) Wire into the orchestrator (LangGraph conditional edges), log probabilities for drift monitoring.
7) Pin the model version; re-calibrate on every version bump; monitor confidence distribution per language/segment.`,
  },
];

export function retrieve(tags: string[], limit = 5): KnowledgeSection[] {
  const scored = KNOWLEDGE.map((s) => ({
    s,
    score: s.tags.filter((t) => tags.includes(t)).length,
  }));
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

export const SOURCES = [
  { label: "DEV: The model that doesn't talk", url: "https://dev.to/danielsamfdo/the-model-that-doesnt-talk-5adm" },
  { label: "Dale Seo: Jev deep-dive (KO)", url: "https://daleseo.com/jev/" },
  { label: "promptfoo TypeSafe provider", url: "https://www.promptfoo.dev/docs/providers/typesafe/" },
  { label: "nexos.ai: What is Jev", url: "https://nexos.ai/blog/what-is-jev/" },
  { label: "TypeSafe API docs", url: "https://docs.typesafe.ai/api" },
];
