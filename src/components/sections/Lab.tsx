"use client";

import { useState } from "react";
import { useByok } from "../byok";
import { Badge, Md, SectionTitle, Thinking, Trace, type TraceStep } from "../ui";

type Usage = { input: number; output: number; calls: number };
type HybridResult = {
  gate: {
    team: { choice: string; probabilities: Record<string, number>; confidence: number };
    urgency: { score: number; probabilities: Record<string, number>; legend: string[] };
    needsWrittenReply: { noul: number };
    refundRequest: { noul: number };
  };
  route: "auto" | "llm" | "human";
  output: string;
  trace: TraceStep[];
  gateUsage: Usage;
  genUsage: Usage;
  ms: number;
};

const SAMPLES = [
  "I was charged twice for my Pro plan this month. Can you refund the duplicate charge? Order #4471.",
  "How do I reset my password?",
  "Our production webhook has returned 500s for 2 hours. We're losing orders. Logs attached, need a root cause ASAP.",
  "CONGRATS!!! You won a free iPhone, click here to claim your prize now",
  "Hmm, not sure if this is a bug or my setup, the export kind of works but the totals look off compared to last invoice?",
];

const ROUTE_STYLE = {
  auto: { label: "✅ Auto action — 0 generation tokens", cls: "from-emerald-400/30 to-emerald-400/5 border-emerald-300/40" },
  llm: { label: "🧠 LLM draft — tokens spent where they matter", cls: "from-amber-400/30 to-amber-400/5 border-amber-300/40" },
  human: { label: "🧑‍💼 Human review — confidence too low / high risk", cls: "from-rose-500/30 to-rose-500/5 border-rose-400/40" },
};

function Bars({ probs, highlight }: { probs: Record<string, number>; highlight?: string }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(probs).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className={`w-20 shrink-0 ${k === highlight ? "font-bold text-white" : "text-white/60"}`}>{k}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${k === highlight ? "bg-gradient-to-r from-fuchsia-500 to-cyan-400" : "bg-white/30"}`}
              style={{ width: `${v * 100}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-white/70">{(v * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

function Gauge({ label, p }: { label: string; p: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="font-mono font-bold">{p.toFixed(2)}</span>
      </div>
      <div className="relative mt-1 h-2.5 rounded-full bg-gradient-to-r from-rose-500/50 via-white/20 to-lime-400/60">
        <div className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded bg-white shadow" style={{ left: `calc(${p * 100}% - 3px)` }} />
      </div>
    </div>
  );
}

export function Lab() {
  const { post, apiKey, setOpen } = useByok();
  const [ticket, setTicket] = useState(SAMPLES[0]);
  const [threshold, setThreshold] = useState(0.6);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<HybridResult | null>(null);
  const [runs, setRuns] = useState<{ route: string; gateTok: number; genTok: number }[]>([]);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await post<HybridResult>("/api/hybrid", { ticket, threshold });
      setRes(r);
      setRuns((x) => [...x, { route: r.route, gateTok: r.gateUsage.input + r.gateUsage.output, genTok: r.genUsage.input + r.genUsage.output }]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const llmRuns = runs.filter((r) => r.route === "llm").length;

  return (
    <div className="space-y-8 pt-6">
      <SectionTitle
        kicker="LangGraph · live demo"
        title="Hybrid Lab: JEV gate → LLM only when needed"
        sub="A real LangGraph StateGraph: jevGate → router (conditional edge) → autoResolve | llmDraft | humanReview. Groq emulates JEV's typed output here so you can run it today with just a Groq key."
      />

      <div className="glass rounded-2xl p-4 overflow-x-auto">
        <div className="flex min-w-[620px] items-center gap-2 text-xs font-semibold">
          {[
            ["START", "bg-white/10", ""],
            ["⚡ jevGate", "bg-fuchsia-500/30", "jevGate"],
            ["🔀 router", "bg-violet-500/30", "router"],
          ].map(([t, c, n]) => (
            <div key={t} className="flex items-center gap-2">
              <div className={`rounded-lg px-3 py-1.5 ${c} ${res?.trace.some((s) => s.node === n) ? "ring-2 ring-white/70" : ""}`}>{t}</div>
              <span className="text-white/40">→</span>
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            {[
              ["✅ autoResolve", "bg-emerald-400/25", "auto"],
              ["🧠 llmDraft", "bg-amber-400/25", "llm"],
              ["🧑‍💼 humanReview", "bg-rose-400/25", "human"],
            ].map(([t, c, r]) => (
              <div key={t} className={`rounded-lg px-3 py-1 ${c} ${res?.route === r ? "ring-2 ring-white/80" : "opacity-60"}`}>
                {t}
              </div>
            ))}
          </div>
          <span className="text-white/40">→</span>
          <div className="rounded-lg bg-white/10 px-3 py-1.5">END</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s, i) => (
              <button
                key={i}
                onClick={() => setTicket(s)}
                className={`rounded-full px-3 py-1 text-xs transition ${ticket === s ? "bg-fuchsia-500 text-black font-semibold" : "bg-white/10 hover:bg-white/15"}`}
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
          <textarea
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-white/15 bg-black/30 p-3 text-sm outline-none focus:border-fuchsia-400"
            placeholder="Paste a support ticket…"
          />
          <label className="block">
            <div className="flex justify-between text-sm">
              <span className="text-white/75">Confidence threshold (below → human)</span>
              <span className="font-mono font-bold text-fuchsia-200">{(threshold * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={0.3} max={0.95} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full" />
          </label>
          <button
            onClick={apiKey ? run : () => setOpen(true)}
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 py-3 font-bold text-black disabled:opacity-60"
          >
            {busy ? "Running graph…" : apiKey ? "▶ Run the graph" : "🔑 Add Groq key to run"}
          </button>
          {err && <p className="rounded-lg bg-rose-500/20 p-3 text-sm text-rose-200">{err}</p>}

          {runs.length > 0 && (
            <div className="glass rounded-xl p-4 text-sm">
              <p className="font-semibold">Session tally ({runs.length} runs)</p>
              <p className="mt-1 text-white/70">
                LLM generation needed in <b className="text-amber-200">{llmRuns}</b> of {runs.length} tickets —{" "}
                <b className="text-lime-200">{runs.length - llmRuns}</b> resolved with zero generation tokens.
              </p>
              <p className="mt-1 text-xs text-white/50">
                In production the gate runs on JEV (no output tokens, ~$0.042/1M input); here the gate&apos;s Groq tokens are shown for transparency.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {busy && <Thinking />}
          {res && (
            <>
              <div className={`rounded-2xl border bg-gradient-to-br p-4 ${ROUTE_STYLE[res.route].cls}`}>
                <p className="font-bold">{ROUTE_STYLE[res.route].label}</p>
                <div className="mt-2">
                  <Md>{res.output}</Md>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass rounded-xl p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-fuchsia-200">
                    Choice · team <span className="text-white/50">conf {(res.gate.team.confidence * 100).toFixed(0)}%</span>
                  </p>
                  <Bars probs={res.gate.team.probabilities} highlight={res.gate.team.choice} />
                </div>
                <div className="glass rounded-xl p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-200">
                    Score · urgency <span className="text-white/50">{res.gate.urgency.score} / 3</span>
                  </p>
                  <Bars probs={res.gate.urgency.probabilities} highlight={res.gate.urgency.legend[Math.round(res.gate.urgency.score)]} />
                </div>
              </div>
              <div className="glass space-y-3 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Noul</p>
                <Gauge label="Needs a personalised written reply?" p={res.gate.needsWrittenReply.noul} />
                <Gauge label="Refund request?" p={res.gate.refundRequest.noul} />
              </div>
              <div className="glass rounded-xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Graph trace</p>
                  <Badge color="violet">{res.ms} ms total</Badge>
                </div>
                <Trace steps={res.trace} />
                <p className="mt-3 text-xs text-white/50">
                  Gate tokens (simulated JEV via Groq): {res.gateUsage.input + res.gateUsage.output} · Generation tokens:{" "}
                  {res.genUsage.input + res.genUsage.output}
                </p>
              </div>
            </>
          )}
          {!res && !busy && (
            <div className="glass grid h-full min-h-[240px] place-items-center rounded-2xl p-6 text-center text-white/50">
              Pick a sample (try #2, #4 and #5) and run the graph to see probabilities, routing and token spend.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
