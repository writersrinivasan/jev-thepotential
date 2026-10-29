"use client";

import { Badge, Card, Code, SectionTitle } from "../ui";

const PRIMITIVES = [
  {
    name: "Choice",
    icon: "🎯",
    accent: "fuchsia" as const,
    what: "Pick exactly one option from a fixed set (≤ 255).",
    use: "Routing, triage, classification, intent detection.",
    out: `{ "choice": "billing",
  "probabilities": { "billing": 0.86,
    "technical": 0.09, "sales": 0.05 },
  "confidence": 0.86 }`,
  },
  {
    name: "Score",
    icon: "📊",
    accent: "cyan" as const,
    what: "Place input on an ordered rubric (2–10 levels, low → high).",
    use: "Severity, urgency, quality, risk, tone.",
    out: `{ "score": 2.4,
  "legend": ["low","normal","high","critical"],
  "probabilities": { ... },
  "confidence": 0.71 }`,
  },
  {
    name: "Noul",
    icon: "⚖️",
    accent: "amber" as const,
    what: "A yes/no question → probability the answer is YES.",
    use: "Gates, guardrails, filters, 'is it done?' checks.",
    out: `{ "noul": 0.93 }

// 0.5 = "I don't know",
// NOT "moderately yes"`,
  },
];

const PLACEMENT = [
  { icon: "🚦", title: "Front-door router", text: "Classify every request → cheap model, frontier model, tool, or human.", accent: "fuchsia" as const },
  { icon: "🛡️", title: "Agent guardrail", text: "Rate each proposed tool call deny / ask / allow; watch traces for jailbreaks.", accent: "rose" as const },
  { icon: "🔀", title: "LangGraph conditional edge", text: "The edge function calls JEV instead of an LLM to pick the next node.", accent: "violet" as const },
  { icon: "🧪", title: "Eval / LLM-as-judge", text: "Rubric scoring in CI at ~1/100th the cost (promptfoo provider).", accent: "lime" as const },
  { icon: "🧹", title: "Pre / post filters", text: "Relevant? Contains PII? Answer grounded in the doc? — before paying for generation.", accent: "sky" as const },
  { icon: "🔁", title: "Loop terminator", text: "“Is the task complete?” Noul inside agent loops instead of another LLM turn.", accent: "amber" as const },
];

const NUANCES = [
  ["🔍", "Literal reader", "Answers exactly what you asked. Missing context in instructions → wrong answers."],
  ["⚛️", "Atomic questions", "Avoid negation and multi-step questions. Ask many small ones; combine in code."],
  ["🧮", "No math", "Counting, arithmetic and date maths degrade fast. One Noul per item, sum in code."],
  ["🎚️", "Thresholds don't transfer", "Choice vs Noul on the same judgment gives different numbers; yes/no needn't sum to 1."],
  ["🌐", "Calibrate per language", "Ambiguous non-English inputs showed much lower confidence. Tune thresholds per locale."],
  ["📌", "Pin versions", "jev-latest drifts. Pin jev-1.13.0 when your thresholds depend on behaviour."],
  ["🧷", "Not adversarial-safe", "Inputs aren't treated as hostile. Keep a separate prompt-injection defence."],
  ["🧾", "No explanations", "Probabilities ≠ reasons. Regulated audits may still need an LLM or rules trail."],
  ["✂️", "Filter the state", "Irrelevant context hurts. Send structured JSON and reference fields by path."],
  ["📏", "32k state limit", "~64k per request; state + longest question ≤ ~32k. Chunk long documents."],
];

export function Understand() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="pt-6 md:pt-10">
        <div className="flex flex-wrap gap-2">
          <Badge color="fuchsia">TypeSafe AI · launched Sept 2026</Badge>
          <Badge color="cyan">“System One” model</Badge>
          <Badge color="amber">no output tokens</Badge>
        </div>
        <h1 className="mt-4 text-4xl md:text-6xl font-black leading-[1.05]">
          <span className="grad-text">JEV</span> — the model that
          <br className="hidden md:block" /> decides instead of talks.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-white/75">
          JEV is a transformer that <b className="text-white">never generates text</b>. You hand it a <i>state</i> and a set of
          typed questions; it returns <b className="text-fuchsia-200">calibrated probabilities</b> in a single forward pass —
          typically <b className="text-cyan-200">70–500 ms</b> at roughly <b className="text-amber-200">$0.042 / 1M input tokens</b>{" "}
          <span className="text-white/50">(vendor figures)</span>.
        </p>
      </section>

      {/* System 1 vs 2 */}
      <section>
        <SectionTitle kicker="Mental model" title="System 1 vs System 2" sub="Borrowed from Kahneman: fast intuitive judgment vs slow deliberate reasoning. Good AI systems need both." />
        <div className="grid gap-4 md:grid-cols-2">
          <Card accent="fuchsia" icon="⚡" title="JEV = System 1 (reflex)">
            <ul className="list-disc ml-5 space-y-1">
              <li>Typed answers only: Choice · Score · Noul</li>
              <li>One parallel forward pass, no decoding loop</li>
              <li>Cannot produce a label outside your option set</li>
              <li>Confidence is the product (trained for calibration)</li>
            </ul>
          </Card>
          <Card accent="cyan" icon="🧠" title="LLM = System 2 (deliberation)">
            <ul className="list-disc ml-5 space-y-1">
              <li>Free-form text, code, explanations, plans</li>
              <li>Token-by-token autoregressive generation</li>
              <li>Output tokens billed at ~5× input</li>
              <li>Needs parsing &amp; validation for decisions</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section>
        <SectionTitle kicker="Under the hood" title="How JEV works" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="1 · Same backbone, different head" icon="🧩">
            A transformer encodes your <b>state</b> (text or JSON) plus the question. Instead of a language-model head predicting the next
            token, a <b>decision head</b> scores every candidate answer at once. TypeSafe hasn&apos;t published the architecture; outside observers
            suspect an open-weight base with a swapped head (unconfirmed).
          </Card>
          <Card title="2 · Trained with RLCD" icon="🎓">
            <b>Reinforcement Learning for Calibrated Decisions</b> on synthetic data. Where RLHF optimises human preference and RLVR verifiable
            correctness, RLCD optimises <b>calibration</b> using proper scoring rules (log-loss, Brier). A 0.8 should be right ~80% of the time.
          </Card>
          <Card title="3 · Batch many questions" icon="📦">
            All questions in a request are answered against the same state. Extra questions add little latency — the vendor cookbook reports
            13 questions on one document at <b>12× lower cost and 10× faster</b> than separate calls.
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <p className="mb-3 text-sm font-semibold text-cyan-200">LLM deciding “billing or technical?”</p>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              {["prompt", "→", "{", "\"", "team", "\":", " \"", "bill", "ing", "\"", "}", "→", "JSON.parse", "→", "validate"].map((t, i) => (
                <span key={i} className={t === "→" ? "text-white/40" : "rounded bg-cyan-400/15 px-1.5 py-0.5 text-cyan-100"}>
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/60">~10 decode passes · output tokens billed · may emit an invalid label</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="mb-3 text-sm font-semibold text-fuchsia-200">JEV deciding the same thing</p>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5">state + question</span>
              <span className="text-white/40">→</span>
              <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5">1 forward pass</span>
              <span className="text-white/40">→</span>
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5">{"{billing: .86, technical: .09, …}"}</span>
            </div>
            <p className="mt-3 text-xs text-white/60">1 pass · zero output tokens · label always valid · free confidence</p>
          </div>
        </div>
      </section>

      {/* Primitives */}
      <section>
        <SectionTitle kicker="What to implement" title="The three primitives" sub="Pick the type by how your code will branch on the answer." />
        <div className="grid gap-4 md:grid-cols-3">
          {PRIMITIVES.map((p) => (
            <Card key={p.name} accent={p.accent} icon={p.icon} title={p.name}>
              <p>{p.what}</p>
              <p className="mt-1 text-white/60">
                <b className="text-white/80">Use for:</b> {p.use}
              </p>
              <div className="mt-3">
                <Code>{p.out}</Code>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Where */}
      <section>
        <SectionTitle kicker="Where to implement" title="Six places JEV fits in your stack" sub="JEV belongs in the decision layer — never the generation layer." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEMENT.map((p) => (
            <Card key={p.title} accent={p.accent} icon={p.icon} title={p.title}>
              {p.text}
            </Card>
          ))}
        </div>
        <div className="mt-6 glass rounded-2xl p-5 overflow-x-auto">
          <p className="mb-4 text-sm font-semibold text-white/80">Reference architecture: JEV as the reflex layer around LLMs</p>
          <div className="flex min-w-[640px] items-center justify-between gap-2 text-xs font-semibold">
            {[
              ["📨 Request", "bg-white/10"],
              ["⚡ JEV gate", "bg-fuchsia-500/30 border border-fuchsia-400/50"],
              ["🔀 Router", "bg-violet-500/30"],
            ].map(([t, c], i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`rounded-xl px-3 py-2 ${c}`}>{t}</div>
                <span className="text-white/40">→</span>
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <div className="rounded-xl bg-emerald-400/25 px-3 py-1.5">✅ Auto action (0 tokens)</div>
              <div className="rounded-xl bg-sky-500/25 px-3 py-1.5">🐇 Small LLM</div>
              <div className="rounded-xl bg-amber-400/25 px-3 py-1.5">🧠 Frontier LLM</div>
              <div className="rounded-xl bg-rose-400/25 px-3 py-1.5">🧑‍💼 Human review</div>
            </div>
            <span className="text-white/40">→</span>
            <div className="rounded-xl bg-fuchsia-500/30 border border-fuchsia-400/50 px-3 py-2">⚡ JEV post-check</div>
          </div>
        </div>
      </section>

      {/* Nuances */}
      <section>
        <SectionTitle kicker="All the nuances" title="Gotchas before you ship" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {NUANCES.map(([icon, t, d]) => (
            <div key={t} className="glass rounded-xl p-4">
              <div className="text-2xl">{icon}</div>
              <p className="mt-1 text-sm font-bold">{t}</p>
              <p className="mt-1 text-xs text-white/65 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
