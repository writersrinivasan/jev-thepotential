"use client";

import { useState } from "react";
import { ByokProvider, KeyButton } from "@/components/byok";
import { Understand } from "@/components/sections/Understand";
import { Industry } from "@/components/sections/Industry";
import { Implement } from "@/components/sections/Implement";
import { Lab } from "@/components/sections/Lab";
import { Assistant } from "@/components/sections/Assistant";
import { SOURCES } from "@/lib/knowledge";

const TABS = [
  { id: "understand", label: "Understand", icon: "🧬", el: <Understand /> },
  { id: "industry", label: "Industry & Cost", icon: "🏭", el: <Industry /> },
  { id: "implement", label: "Implement", icon: "🛠️", el: <Implement /> },
  { id: "lab", label: "Hybrid Lab", icon: "⚗️", el: <Lab /> },
  { id: "assistant", label: "AI Assistant", icon: "💬", el: <Assistant /> },
];

export default function Home() {
  const [tab, setTab] = useState(TABS[0].id);
  return (
    <ByokProvider>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0820]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button onClick={() => setTab("understand")} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 font-black text-black">J</span>
            <span className="font-extrabold tracking-tight">
              JEV <span className="grad-text">Explorer</span>
            </span>
          </button>
          <KeyButton />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                tab === t.id ? "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16">
        {TABS.map((t) => (
          // keep every tab mounted so chat/lab state survives tab switches
          <div key={t.id} hidden={tab !== t.id}>
            {t.el}
          </div>
        ))}
      </main>

      <footer className="border-t border-white/10 py-6 text-xs text-white/50">
        <div className="mx-auto max-w-6xl px-4">
          <p>
            Facts as of Oct 2026 from public write-ups; speed/price figures are vendor-reported. The Hybrid Lab emulates JEV with Groq — it is
            not the TypeSafe model. Sources:{" "}
            {SOURCES.map((s, i) => (
              <span key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                  {s.label}
                </a>
                {i < SOURCES.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      </footer>
    </ByokProvider>
  );
}
