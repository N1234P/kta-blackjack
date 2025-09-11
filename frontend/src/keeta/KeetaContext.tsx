"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

type BalanceResult = {
  balance?: number;                 // human (preferred)
  balanceRaw?: string | number;     // raw base units (fallback)
  decimals?: number;                // usually 9
};

export type KeetaSession = {
  seed: string;    // mnemonic/seed (demo only)
  address: string; // derived public address
};

type KeetaContextValue = {
  connected: boolean;
  address: string | null;
  session: KeetaSession | null;

  // keep your original APIs
  connectFromSeed: (seedPhrase: string) => Promise<void>;
  createWallet: () => Promise<void>;
  disconnect: () => void;

  getBalance: (opts: { address?: string; token: string }) => Promise<BalanceResult>;
  // ⬇️ send now accepts an optional memo and can return a txId if the server exposes it
  send: (params: { destination: string; amount: number; memo?: string }) =>
    Promise<{ txId?: string }>;
};

const KeetaCtx = createContext<KeetaContextValue | null>(null);

// -------- internal helper to call /api/keeta --------
async function api<T>(body: any): Promise<T> {
  const r = await fetch("/api/keeta", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error ?? "Keeta API error");
  return json as T;
}

export function KeetaProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<KeetaSession | null>(null);

  // demo persistence (safe-ish for testnet only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("keeta.session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (session) localStorage.setItem("keeta.session", JSON.stringify(session));
      else localStorage.removeItem("keeta.session");
    } catch {}
  }, [session]);

  const connected = !!session;
  const address = session?.address ?? null;

  // -------- wallet connect / create / disconnect --------
  const connectFromSeed = useCallback(async (seedPhrase: string) => {
    const seed = seedPhrase.trim();
    if (!seed) throw new Error("Please paste your mnemonic seed phrase.");
    const { address } = await api<{ address: string }>({ op: "address", seed });
    if (!address?.startsWith("keeta_")) throw new Error("Failed to derive address");
    setSession({ seed, address });
  }, []);

  const createWallet = useCallback(async () => {
    // requires /api/keeta to support { op: "create" }
    const { seed, address } = await api<{ seed: string; address: string }>({ op: "create" });
    if (!seed || !address) throw new Error("Failed to create wallet");
    setSession({ seed, address });
  }, []);

  const disconnect = useCallback(() => {
    setSession(null);
  }, []);

  // -------- balance --------
  const getBalance = useCallback(async (opts: { address?: string; token: string }) => {
    if (!session && !opts?.address) {
      throw new Error("Not connected. Provide an address or connect first.");
    }
    const addr = (opts?.address ?? session?.address) as string;
    const token = opts.token;
    if (!token) throw new Error("Missing token id (e.g., keeta_...)");

    return api<BalanceResult>({
      op: "balance",
      seed: session?.seed ?? "", // server may ignore seed for public address queries
      address: addr,
      token,
    });
  }, [session]);

  // -------- send (now supports memo) --------
  const send = useCallback(async (params: { destination: string; amount: number; memo?: string }) => {
    if (!session) throw new Error("Not connected");
    const destination = params.destination?.trim();
    const amount = Number(params.amount);
    const memo = params.memo;

    if (!destination) throw new Error("Destination required");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

    const res = await api<{ success: true; txId?: string }>({
      op: "send",
      seed: session.seed,
      destination,
      amount,
      memo, // ⬅️ forwarded
    });

    return { txId: res.txId };
  }, [session]);

  const value = useMemo<KeetaContextValue>(() => ({
    connected,
    address,
    session,
    connectFromSeed,
    createWallet,
    disconnect,
    getBalance,
    send,
  }), [connected, address, session, connectFromSeed, createWallet, disconnect, getBalance, send]);

  return <KeetaCtx.Provider value={value}>{children}</KeetaCtx.Provider>;
}

export function useKeeta() {
  const ctx = useContext(KeetaCtx);
  if (!ctx) throw new Error("useKeeta must be used within KeetaProvider");
  return ctx;
}
