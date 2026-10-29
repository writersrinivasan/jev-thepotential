"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORE_KEY = "jev.groqKey";
const STORE_MODEL = "jev.groqModel";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

type Byok = {
  apiKey: string;
  model: string;
  models: string[];
  setModel: (m: string) => void;
  save: (key: string, remember: boolean) => Promise<string | null>;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  post: <T>(url: string, body: unknown) => Promise<T>;
};

const Ctx = createContext<Byok | null>(null);

function safeGet(store: "local" | "session", k: string) {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(k) ?? "";
  } catch {
    return "";
  }
}

export function ByokProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const loadModels = useCallback(async (key: string) => {
    const res = await fetch("/api/models", { headers: { "x-groq-key": key } });
    const data = await res.json();
    if (!res.ok) return data.error as string;
    setModels(data.models);
    setModelState((cur) => (data.models.includes(cur) ? cur : data.models.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : data.models[0]));
    return null;
  }, []);

  useEffect(() => {
    const k = safeGet("session", STORE_KEY) || safeGet("local", STORE_KEY);
    const m = safeGet("local", STORE_MODEL);
    // Restoring from browser storage must happen after hydration, so an effect is the right place.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (m) setModelState(m);
    if (k) {
      setApiKey(k);
      loadModels(k);
    }
  }, [loadModels]);

  const save = async (key: string, remember: boolean) => {
    const k = key.trim();
    if (!k.startsWith("gsk_")) return "Groq keys start with gsk_";
    const err = await loadModels(k);
    if (err) return err;
    setApiKey(k);
    try {
      sessionStorage.setItem(STORE_KEY, k);
      if (remember) localStorage.setItem(STORE_KEY, k);
      else localStorage.removeItem(STORE_KEY);
    } catch {}
    return null;
  };

  const clear = () => {
    setApiKey("");
    setModels([]);
    try {
      sessionStorage.removeItem(STORE_KEY);
      localStorage.removeItem(STORE_KEY);
    } catch {}
  };

  const setModel = (m: string) => {
    setModelState(m);
    try {
      localStorage.setItem(STORE_MODEL, m);
    } catch {}
  };

  const post = async <T,>(url: string, body: unknown): Promise<T> => {
    if (!apiKey) {
      setOpen(true);
      throw new Error("Add your Groq API key first.");
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-groq-key": apiKey },
      body: JSON.stringify({ ...(body as object), model }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data as T;
  };

  return (
    <Ctx.Provider value={{ apiKey, model, models, setModel, save, clear, open, setOpen, post }}>
      {children}
      {open && <KeyDialog />}
    </Ctx.Provider>
  );
}

export function useByok() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useByok outside provider");
  return c;
}

export function KeyButton() {
  const { apiKey, model, models, setModel, setOpen } = useByok();
  return (
    <div className="flex items-center gap-2">
      {apiKey && models.length > 0 && (
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="hidden md:block max-w-[13rem] truncate rounded-lg bg-white/10 border border-white/15 px-2 py-1.5 text-xs"
          aria-label="Groq model"
        >
          {models.map((m) => (
            <option key={m} value={m} className="bg-[#140f33]">
              {m}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={() => setOpen(true)}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          apiKey
            ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/25"
            : "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black hover:brightness-110"
        }`}
      >
        {apiKey ? "🔑 Groq connected" : "🔑 Add Groq key"}
      </button>
    </div>
  );
}

function KeyDialog() {
  const { apiKey, save, clear, setOpen } = useByok();
  const [value, setValue] = useState(apiKey);
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const e = await save(value, remember);
    setBusy(false);
    if (e) setErr(e);
    else setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div className="glass w-full max-w-md rounded-2xl p-6 bg-[#140f33]/90" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold grad-text">Bring your own Groq key</h2>
        <p className="mt-2 text-sm text-white/70">
          Get a free key at{" "}
          <a className="text-cyan-300 underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
            console.groq.com/keys
          </a>
          . It is sent only with your own requests (header <code>x-groq-key</code>), forwarded to Groq, and never stored on the server.
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="gsk_…"
          className="mt-4 w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 font-mono text-sm outline-none focus:border-fuchsia-400"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember on this device (localStorage). Otherwise kept for this tab only.
        </label>
        {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
        <div className="mt-5 flex justify-between gap-2">
          {apiKey ? (
            <button onClick={() => { clear(); setValue(""); }} className="text-sm text-rose-300 hover:underline">
              Forget key
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Save & verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
