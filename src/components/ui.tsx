"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const ACCENTS = {
  fuchsia: "from-fuchsia-500/25 to-fuchsia-500/5 border-fuchsia-400/30 text-fuchsia-200",
  cyan: "from-cyan-400/25 to-cyan-400/5 border-cyan-300/30 text-cyan-200",
  amber: "from-amber-400/25 to-amber-400/5 border-amber-300/30 text-amber-200",
  lime: "from-lime-400/25 to-lime-400/5 border-lime-300/30 text-lime-200",
  rose: "from-rose-500/25 to-rose-500/5 border-rose-400/30 text-rose-200",
  violet: "from-violet-500/25 to-violet-500/5 border-violet-400/30 text-violet-200",
  sky: "from-sky-500/25 to-sky-500/5 border-sky-400/30 text-sky-200",
  emerald: "from-emerald-400/25 to-emerald-400/5 border-emerald-300/30 text-emerald-200",
} as const;
export type Accent = keyof typeof ACCENTS;

export function Card({
  accent,
  title,
  icon,
  children,
  className = "",
}: {
  accent?: Accent;
  title?: React.ReactNode;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const a = accent ? `bg-gradient-to-br ${ACCENTS[accent]}` : "glass";
  return (
    <div className={`rounded-2xl border p-5 ${a} ${className}`}>
      {title && (
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold">
          {icon && <span className="text-xl">{icon}</span>}
          {title}
        </h3>
      )}
      <div className="text-sm leading-relaxed text-white/80">{children}</div>
    </div>
  );
}

export function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 mt-2">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">{kicker}</p>
      <h2 className="mt-1 text-2xl md:text-3xl font-extrabold grad-text">{title}</h2>
      {sub && <p className="mt-2 max-w-3xl text-white/70">{sub}</p>}
    </div>
  );
}

export function Badge({ children, color = "fuchsia" }: { children: React.ReactNode; color?: Accent }) {
  return (
    <span className={`inline-block rounded-full border bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold ${ACCENTS[color]}`}>
      {children}
    </span>
  );
}

export function Md({ children }: { children: string }) {
  return (
    <div className="prose-jev text-sm text-white/85">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="relative">
      {lang && <span className="absolute right-3 top-2 text-[10px] uppercase tracking-wider text-white/40">{lang}</span>}
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#07051a] p-4 text-[12.5px] leading-relaxed text-cyan-100 font-mono">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Thinking({ label = "Running graph" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-white/60">
      {label}
      <span className="dot">●</span>
      <span className="dot">●</span>
      <span className="dot">●</span>
    </span>
  );
}

const NODE_COLORS: Record<string, string> = {
  classify: "bg-fuchsia-500",
  retrieve: "bg-sky-500",
  answer: "bg-amber-400",
  codegen: "bg-lime-400",
  redirect: "bg-rose-400",
  jevGate: "bg-fuchsia-500",
  router: "bg-violet-500",
  autoResolve: "bg-emerald-400",
  llmDraft: "bg-amber-400",
  humanReview: "bg-rose-400",
};

export type TraceStep = { node: string; detail: string; ms: number; tokens?: number };

export function Trace({ steps }: { steps: TraceStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${NODE_COLORS[s.node] ?? "bg-white"}`} />
          <span className="font-mono font-semibold text-white">{s.node}</span>
          <span className="text-white/60 flex-1">{s.detail}</span>
          <span className="shrink-0 font-mono text-white/40">
            {s.ms}ms{s.tokens ? ` · ${s.tokens} tok` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}
