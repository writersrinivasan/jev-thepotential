"use client";

import { useState } from "react";
import { Badge, Code, SectionTitle } from "../ui";

const STEPS = [
  ["🗺️", "Inventory decisions", "Find every place your LLM pipeline parses output into an enum, bool or number. Each one is a JEV candidate."],
  ["✍️", "Write atomic questions", "One judgment per question (Choice / Score / Noul) with explicit criteria descriptions. No negation, no multi-step."],
  ["🧪", "Build an eval set", "200–1,000 real labelled examples. Measure accuracy AND calibration (reliability diagram, Brier score)."],
  ["🎚️", "Set per-action thresholds", "Auto-act above t_high, fall back to LLM/human in the middle, reject below t_low. Stricter for irreversible actions."],
  ["👥", "Shadow-run", "Run JEV beside the existing LLM for 1–2 weeks. Compare agreement, latency and cost before switching."],
  ["🔀", "Wire into the orchestrator", "Use JEV inside LangGraph conditional edges; log probabilities for drift monitoring."],
  ["📌", "Pin & re-calibrate", "Pin jev-1.13.0, re-tune thresholds on every version bump, monitor confidence per language/segment."],
];

const SNIPPETS: Record<string, { lang: string; code: string }> = {
  "fetch (TS)": {
    lang: "ts",
    code: `// Minimal JEV call — verify field names against docs.typesafe.ai/api
const res = await fetch("https://api.typesafe.ai/v1/systemone", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.TYPESAFE_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "jev-1.13.0",               // pin; "jev-latest" can drift
    state: { subject: ticket.subject, body: ticket.body, plan: user.plan },
    questions: {
      team: {
        type: "choice",
        instructions: "Which team should handle this ticket?",
        criteria: {
          billing: "Charges, invoices, refunds, plan changes",
          technical: "Bugs, errors, outages, integration issues",
          account: "Login, access, profile, deletion",
          sales: "Pricing questions, upgrades, demos",
        },
      },
      urgency: {
        type: "score",
        instructions: "How urgent is this for the customer?",
        criteria: ["low", "normal", "high", "critical"],   // low -> high
      },
      wantsRefund: { type: "noul", instructions: "Is the customer asking for a refund?" },
    },
  }),
});
const { model, answers } = await res.json();
// answers.team    -> { choice, probabilities, confidence }
// answers.urgency -> { score, probabilities, legend, confidence }
// answers.wantsRefund -> { noul }   (P(yes), 0.5 = unsure)`,
  },
  "LangGraph edge": {
    lang: "ts",
    code: `import { StateGraph, START, END } from "@langchain/langgraph";

// JEV replaces the LLM *inside the conditional edge* — the decision layer.
async function routeTicket(state: TicketState) {
  const { answers } = await jev({
    state: state.ticket,
    questions: {
      needsReply: { type: "noul", instructions: "Does resolving this need a personalised written reply?" },
      team: { type: "choice", instructions: "Which team?", criteria: TEAMS },
    },
  });
  if (answers.team.confidence < 0.6) return "human";     // uncertain -> human
  if (answers.needsReply.noul < 0.5) return "autoAction"; // 0 LLM tokens
  return "llmDraft";                                      // spend tokens only here
}

const graph = new StateGraph(TicketAnnotation)
  .addNode("autoAction", autoAction)
  .addNode("llmDraft", llmDraft)       // Groq / frontier LLM
  .addNode("human", escalate)
  .addConditionalEdges(START, routeTicket, ["autoAction", "llmDraft", "human"])
  .addEdge("autoAction", END).addEdge("llmDraft", END).addEdge("human", END)
  .compile();`,
  },
  "Python": {
    lang: "py",
    code: `import os, requests

def jev(state, questions, model="jev-1.13.0"):
    r = requests.post(
        "https://api.typesafe.ai/v1/systemone",
        headers={"Authorization": f"Bearer {os.environ['TYPESAFE_API_KEY']}"},
        json={"model": model, "state": state, "questions": questions},
        timeout=5,
    )
    r.raise_for_status()
    return r.json()["answers"]

# Count with code, not with the model: one Noul per item
items = load_line_items(invoice)
answers = jev(
    {"items": items},
    {f"is_software_{i}": {"type": "noul",
        "instructions": f"Is items[{i}] a software subscription?"}
     for i in range(len(items))},
)
software_count = sum(a["noul"] > 0.5 for a in answers.values())`,
  },
  "Threshold policy": {
    lang: "ts",
    code: `// Per-action thresholds sized by the cost of being wrong
const POLICY = {
  closeAsSpam:   { autoAbove: 0.97, humanBelow: 0.80 },  // irreversible-ish
  routeToQueue:  { autoAbove: 0.70, humanBelow: 0.45 },  // cheap to fix
  issueRefund:   { autoAbove: 0.99, humanBelow: 0.90 },  // money moves
} as const;

function decide(action: keyof typeof POLICY, p: number) {
  const t = POLICY[action];
  if (p >= t.autoAbove) return "auto";
  if (p < t.humanBelow) return "human";
  return "llm-second-opinion";   // escalate to System 2 only in the grey zone
}

// Log every probability: drift in the confidence distribution
// is your early-warning signal after a model or data change.`,
  },
  "promptfoo grader": {
    lang: "yaml",
    code: `# Use JEV as a cheap LLM-as-judge in CI
defaultTest:
  assert:
    - type: llm-rubric
      value: "Answer is grounded in the provided policy document"
      provider:
        id: typesafe:jev-latest
        config:
          threshold: 0.7
    - type: classifier
      provider:
        id: typesafe:jev-latest
        config:
          instructions: "What is the tone of the reply?"
          labels: [friendly, neutral, rude]`,
  },
};

export function Implement() {
  const [tab, setTab] = useState(Object.keys(SNIPPETS)[0]);
  return (
    <div className="space-y-14 pt-6">
      <section>
        <SectionTitle kicker="Practical guidance" title="Implementation playbook" sub="From 'we use an LLM to classify things' to a calibrated JEV gate in production." />
        <ol className="relative space-y-3 border-l-2 border-dashed border-fuchsia-400/40 pl-6">
          {STEPS.map(([icon, t, d], i) => (
            <li key={t} className="glass relative rounded-xl p-4">
              <span className="absolute -left-[2.35rem] top-4 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-sm font-black text-black">
                {i + 1}
              </span>
              <p className="font-bold">
                {icon} {t}
              </p>
              <p className="mt-1 text-sm text-white/70">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle kicker="Code" title="Copy-ready patterns" />
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.keys(SNIPPETS).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                tab === k ? "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black" : "bg-white/10 text-white/75 hover:bg-white/15"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <Code lang={SNIPPETS[tab].lang}>{SNIPPETS[tab].code}</Code>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <Badge color="amber">Verify</Badge> Request shape is assembled from public write-ups (Sept–Oct 2026). Confirm exact field names
          (especially <code>criteria</code>) in TypeSafe&apos;s API reference; the official TS SDK is <code>@typesafe-ai/sdk</code> (helpers{" "}
          <code>choice()</code>, <code>score()</code>, <code>noul()</code>, <code>systemOne()</code>), Python is <code>typesafe-sdk</code>.
        </p>
      </section>
    </div>
  );
}
