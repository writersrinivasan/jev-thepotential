"use client";

import { useMemo, useState } from "react";
import { Accent, Badge, Card, SectionTitle } from "../ui";

const INDUSTRIES: { icon: string; name: string; accent: Accent; items: string[]; proof?: string }[] = [
  { icon: "🎧", name: "Customer support", accent: "fuchsia", items: ["Team routing (Choice)", "Urgency (Score)", "“Refund request?” (Noul)", "LLM only drafts replies that need one"] },
  { icon: "🛠️", name: "DevOps & security", accent: "rose", items: ["Shell-command safety: deny / ask / allow", "PR risk scoring", "Alert severity & dedup"], proof: "Vercel: replaced an LLM classifier — 5–18× faster, more accurate" },
  { icon: "🤖", name: "Agent platforms", accent: "violet", items: ["Tool-call permissioning", "Jailbreak detection in traces", "“Task complete?” loop exit", "Model routing: cheap vs frontier"], proof: "LangChain: evaluating JEV for model routing" },
  { icon: "📧", name: "Email & back-office", accent: "sky", items: ["Inbox triage", "Document-type routing", "SLA breach risk"], proof: "Bryo AI: Gemini slightly more accurate, but 10–20× pricier" },
  { icon: "🏦", name: "Fintech & insurance", accent: "amber", items: ["Transaction risk flags", "Claim category & fraud suspicion", "KYC doc completeness"], proof: "Keep humans on low-confidence; probabilities ≠ audit trail" },
  { icon: "🛡️", name: "Trust & safety", accent: "emerald", items: ["Moderation labels at high QPS", "Spam / scam detection", "Policy-violation probability"] },
  { icon: "🛒", name: "E-commerce & search", accent: "cyan", items: ["Query intent", "Taxonomy mapping (≤255/question; chain for more)", "Review sentiment & aspect tags"] },
  { icon: "🏥", name: "Healthcare & legal intake", accent: "lime", items: ["Route to specialist queue", "Urgency pre-screen", "Never the final decision-maker"] },
  { icon: "🗂️", name: "Data pipelines", accent: "violet", items: ["Cheap labelling of corpora", "Relevance filtering before RAG", "“Same entity?” dedup checks"] },
];

const VERDICT: { q: string; a: string; color: Accent; verdict: string; body: string }[] = [
  {
    q: "An alternative to LLMs?",
    a: "No",
    color: "rose",
    verdict: "Not a replacement",
    body: "It cannot write text, code or explanations, can't do multi-step reasoning, and its context (~32k state) is far below 1M-token frontier models. Anything generative stays with the LLM.",
  },
  {
    q: "Another technique?",
    a: "Yes",
    color: "cyan",
    verdict: "A promptable calibrated classifier",
    body: "Think of the classic ML classifier head — but zero-shot and instruction-driven, with calibrated probabilities as a first-class output. It's a new category: decision models.",
  },
  {
    q: "A bridge for token optimisation?",
    a: "Yes — its killer role",
    color: "lime",
    verdict: "The reflex layer around LLMs",
    body: "Put JEV at every decision point so you only spend output tokens when generation is truly needed: route easy work to small models, skip generation for label-only requests, batch many questions per state.",
  },
];

const COMPARE = [
  ["Output", "Free-form tokens", "Typed values (choice / score / probability)"],
  ["Decoding", "Autoregressive, 1 token / pass", "Single parallel pass"],
  ["Output cost", "Billed (~5× input)", "None"],
  ["Parsing", "Required + validation", "Not needed"],
  ["Invalid label risk", "Possible", "Impossible (fixed space)"],
  ["Confidence", "Ad-hoc / logprobs", "Calibrated by training (RLCD)"],
  ["Latency", "Seconds", "70–500 ms"],
  ["Context", "Up to ~1M tokens", "~32k state"],
  ["Explanations", "Yes", "No"],
  ["Best at", "Reasoning, writing, code", "Judgment among defined options"],
];

function fmt(n: number) {
  return n >= 1000 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;
}

function Calculator() {
  const [req, setReq] = useState(100_000);
  const [inTok, setInTok] = useState(800);
  const [outTok, setOutTok] = useState(250);
  const [pin, setPin] = useState(2.5);
  const [pout, setPout] = useState(10);
  const [genShare, setGenShare] = useState(25);
  const JEV_IN = 0.042;

  const r = useMemo(() => {
    const perReqLLM = (inTok * pin + outTok * pout) / 1e6;
    const llmOnly = req * perReqLLM * 30;
    const gate = (req * inTok * JEV_IN * 30) / 1e6;
    const gen = llmOnly * (genShare / 100);
    const hybrid = gate + gen;
    const saved = llmOnly - hybrid;
    const tokensSaved = req * 30 * (1 - genShare / 100) * (inTok + outTok);
    return { llmOnly, gate, gen, hybrid, saved, pct: llmOnly ? (saved / llmOnly) * 100 : 0, tokensSaved };
  }, [req, inTok, outTok, pin, pout, genShare]);

  const sliders: [string, number, (n: number) => void, number, number, number, string][] = [
    ["Requests / day", req, setReq, 1000, 2_000_000, 1000, req.toLocaleString()],
    ["Avg input tokens", inTok, setInTok, 50, 8000, 50, inTok.toString()],
    ["Avg LLM output tokens (decision)", outTok, setOutTok, 5, 1500, 5, outTok.toString()],
    ["LLM $ / 1M input", pin, setPin, 0.05, 15, 0.05, `$${pin.toFixed(2)}`],
    ["LLM $ / 1M output", pout, setPout, 0.1, 75, 0.1, `$${pout.toFixed(2)}`],
    ["% requests that truly need generation", genShare, setGenShare, 0, 100, 1, `${genShare}%`],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="glass rounded-2xl p-5 space-y-4">
        {sliders.map(([label, v, set, min, max, step, shown]) => (
          <label key={label} className="block">
            <div className="flex justify-between text-sm">
              <span className="text-white/75">{label}</span>
              <span className="font-mono font-bold text-fuchsia-200">{shown}</span>
            </div>
            <input type="range" className="w-full" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
          </label>
        ))}
        <p className="text-xs text-white/50">JEV input priced at $0.042/1M (vendor). Gate runs on 100% of requests; LLM only on the share that needs generation.</p>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/25 to-rose-500/5 p-5">
          <p className="text-sm text-rose-200">LLM for everything / month</p>
          <p className="text-3xl font-black">{fmt(r.llmOnly)}</p>
        </div>
        <div className="rounded-2xl border border-lime-300/30 bg-gradient-to-br from-lime-400/25 to-lime-400/5 p-5">
          <p className="text-sm text-lime-200">JEV gate + LLM only when needed / month</p>
          <p className="text-3xl font-black">{fmt(r.hybrid)}</p>
          <p className="mt-1 text-xs text-white/60">
            gate {fmt(r.gate)} + generation {fmt(r.gen)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-400/25 to-amber-400/5 p-5">
          <p className="text-sm text-amber-200">You save</p>
          <p className="text-3xl font-black">
            {fmt(r.saved)} <span className="text-lg text-amber-200">({r.pct.toFixed(0)}%)</span>
          </p>
          <p className="mt-1 text-xs text-white/60">≈ {(r.tokensSaved / 1e6).toFixed(1)}M LLM tokens/month never sent</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-lime-400 to-amber-300" style={{ width: `${Math.max(0, Math.min(100, r.pct))}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Industry() {
  return (
    <div className="space-y-14 pt-6">
      <section>
        <SectionTitle
          kicker="The big question"
          title="Alternative, new technique, or bridge?"
          sub="Short answer: a complement and a bridge. JEV is the reflex; the LLM is the deliberation. Good systems use reflexes for most decisions."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {VERDICT.map((v) => (
            <Card key={v.q} accent={v.color}>
              <p className="text-xs uppercase tracking-wider text-white/60">{v.q}</p>
              <p className="mt-1 text-2xl font-black text-white">{v.a}</p>
              <p className="mt-1 font-semibold">{v.verdict}</p>
              <p className="mt-2 text-white/75">{v.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle kicker="Head to head" title="LLM vs JEV" />
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-3 text-white/60">Aspect</th>
                <th className="p-3 text-cyan-200">🧠 LLM</th>
                <th className="p-3 text-fuchsia-200">⚡ JEV</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([a, l, j]) => (
                <tr key={a} className="border-t border-white/10">
                  <td className="p-3 font-semibold">{a}</td>
                  <td className="p-3 text-white/75">{l}</td>
                  <td className="p-3 text-white/90">{j}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle kicker="Industrial use cases" title="Where it's already paying off" sub="Any place you currently parse an LLM's output into an enum, boolean or number is a JEV candidate." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((i) => (
            <Card key={i.name} accent={i.accent} icon={i.icon} title={i.name}>
              <ul className="list-disc ml-5 space-y-0.5">
                {i.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {i.proof && <p className="mt-3 rounded-lg bg-black/25 px-3 py-2 text-xs text-white/80">📌 {i.proof}</p>}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle kicker="Token optimisation" title="Cost bridge calculator" sub="Model the monthly bill of 'LLM decides everything' vs 'JEV decides, LLM generates only when needed'." />
        <Calculator />
      </section>

      <section>
        <SectionTitle kicker="Decision guide" title="Should this step use JEV?" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card accent="lime" icon="✅" title="Use JEV when…">
            <ul className="list-disc ml-5 space-y-1">
              <li>The output is a label, a rank, or a yes/no</li>
              <li>You run it at high volume or in a latency-critical path</li>
              <li>You need a real confidence number to threshold on</li>
              <li>You&apos;re using an LLM as a judge, router, or guardrail</li>
              <li>The state fits in ~32k tokens</li>
            </ul>
          </Card>
          <Card accent="rose" icon="⛔" title="Keep the LLM (or code) when…">
            <ul className="list-disc ml-5 space-y-1">
              <li>You need text, code, extraction, or explanations</li>
              <li>Multi-step reasoning or long deliberation is required</li>
              <li>Exact arithmetic / date maths — use code</li>
              <li>Inputs may be adversarial, or include images</li>
              <li>Regulators require a human-readable rationale</li>
            </ul>
          </Card>
        </div>
        <p className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
          <Badge color="amber">Heads-up</Badge> Speed/cost multiples (≈194× faster, ≈445× cheaper) are vendor-reported; benchmark references were averages of frontier LLM answers, so they measure agreement, not ground truth.
        </p>
      </section>
    </div>
  );
}
