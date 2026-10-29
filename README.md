# JEV Explorer

A colourful Next.js 16 app for learning **JEV**, TypeSafe AI's non-generative "System One" decision model. It covers what JEV is, how and where to implement it, the nuances to watch for, industrial use cases, and how JEV relates to LLMs (alternative vs. technique vs. token-optimisation bridge). It includes two **LangGraph** graphs powered by **Groq (BYOK)**.

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

Click **🔑 Add Groq key** and paste a key from https://console.groq.com/keys. No `.env` file is needed.

## Tabs

| Tab | What it covers |
|---|---|
| 🧬 Understand | System 1 vs System 2, how JEV works (single pass, RLCD), Choice / Score / Noul, where it fits, gotchas |
| 🏭 Industry & Cost | Verdict on alternative vs. technique vs. bridge, LLM-vs-JEV table, use cases by industry, cost-bridge calculator, decision guide |
| 🛠️ Implement | 7-step playbook, copy-ready code (fetch, LangGraph edge, Python, threshold policy, promptfoo) |
| ⚗️ Hybrid Lab | Live LangGraph: `jevGate → router → autoResolve \| llmDraft \| humanReview`, with probabilities and token spend |
| 💬 AI Assistant | LangGraph: `classify → retrieve → answer → (codegen)`, grounded on a curated knowledge base |

## Architecture

```
src/lib/knowledge.ts    curated JEV facts (UI + RAG grounding)
src/lib/graphs.ts       both LangGraph StateGraphs (ChatGroq)
src/lib/byok.ts         reads x-groq-key header; never stored/logged
src/app/api/assistant   POST  -> assistant graph
src/app/api/hybrid      POST  -> hybrid bridge graph
src/app/api/models      GET   -> lists chat models for the key
```

**BYOK:** the key is kept in the browser (sessionStorage by default, or localStorage if you tick "remember"). It is sent per request in the `x-groq-key` header and used only to call Groq for that request.

**Simulation note:** in the Hybrid Lab, Groq *emulates* JEV's typed output so the demo runs with just a Groq key. To use the real model, replace the `jevGate` node in `src/lib/graphs.ts` with a `POST https://api.typesafe.ai/v1/systemone` call (see the Implement tab), and verify field names in TypeSafe's API reference.

Facts are as of Oct 2026. Speed and price multiples are vendor-reported.
