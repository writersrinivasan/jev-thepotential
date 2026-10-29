"use client";

import { useEffect, useRef, useState } from "react";
import { useByok } from "../byok";
import { Badge, Md, SectionTitle, Thinking, Trace, type TraceStep } from "../ui";

type Msg = {
  role: "user" | "assistant";
  content: string;
  code?: string;
  trace?: TraceStep[];
  intent?: string;
  tokens?: number;
  ms?: number;
  error?: boolean;
};

type AssistantResult = {
  answer: string;
  code: string;
  intent: string;
  trace: TraceStep[];
  usage: { input: number; output: number; calls: number };
  ms: number;
};

const STARTERS = [
  "Explain JEV like I'm a backend engineer. How is it different from an LLM?",
  "Where exactly should JEV sit in a LangGraph customer-support agent? Show code.",
  "Is JEV an alternative to LLMs or a bridge for token optimisation?",
  "Give me 5 industrial use cases for a bank, with which primitive to use.",
  "What are the gotchas when calibrating thresholds?",
  "Write a TypeScript guardrail that uses JEV to allow/ask/deny agent tool calls.",
];

export function Assistant() {
  const { post, apiKey, setOpen, model } = useByok();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    if (!apiKey) return setOpen(true);
    const history = msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const r = await post<AssistantResult>("/api/assistant", { question, history });
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: r.answer, code: r.code, trace: r.trace, intent: r.intent, tokens: r.usage.input + r.usage.output, ms: r.ms },
      ]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-6">
      <SectionTitle
        kicker="LangGraph · Groq BYOK"
        title="Ask the JEV assistant"
        sub="Each question runs a LangGraph: classify (router) → retrieve (curated JEV knowledge) → answer → optional codegen. Expand any reply to see the graph trace."
      />
      <div className="glass flex min-h-[60vh] flex-col rounded-2xl">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {msgs.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/15 to-cyan-400/10 p-3 text-left text-sm text-white/85 transition hover:border-fuchsia-400/50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2.5 text-sm text-white">
                {m.content}
              </div>
            ) : (
              <div
                key={i}
                className={`max-w-[95%] rounded-2xl rounded-bl-sm border px-4 py-3 ${m.error ? "border-rose-400/40 bg-rose-500/15 text-rose-200 text-sm" : "border-white/10 bg-black/25"}`}
              >
                {m.error ? (
                  m.content
                ) : (
                  <>
                    <Md>{m.content}</Md>
                    {m.code && (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <Badge color="lime">codegen node</Badge>
                        <Md>{m.code}</Md>
                      </div>
                    )}
                    {m.trace && (
                      <details className="mt-3 rounded-lg bg-white/5 p-3">
                        <summary className="cursor-pointer text-xs text-white/60">
                          Graph trace · intent <b className="text-fuchsia-200">{m.intent}</b> · {m.tokens} tokens · {m.ms} ms
                        </summary>
                        <div className="mt-2">
                          <Trace steps={m.trace} />
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            ),
          )}
          {busy && <Thinking label="classify → retrieve → answer" />}
          <div ref={endRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-white/10 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={apiKey ? `Ask anything about JEV… (${model})` : "Add your Groq key to start chatting"}
            className="flex-1 rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-fuchsia-400"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 text-sm font-bold text-black disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
