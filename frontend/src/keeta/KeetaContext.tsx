"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type BalanceResult = {
  balance: string | number | bigint;
};

export type KeetaSession = {
  seed: string;      // mnemonic seed phrase (kept in memory; persisted for demo)
  address: string;   // derived public address
};

type KeetaContextValue = {
  connected: boolean;
  address: string | null;
  session: KeetaSession | null;

  /** last known raw balance (as returned by API) */
  cachedBalance: string | number | bigint | null;

  /** Import existing wallet (mnemonic seed phrase) and derive address */
  connectFromSeed: (seedPhrase: string) => Promise<void>;

  /** Clear in-memory seed/address and local cache */
  disconnect: () => void;

  /** Get balance for an address+token (defaults to current address) */
  getBalance: (opts?: { address?: string; token: string }) => Promise<BalanceResult>;

  /** Send amount (number) of base token to destination */
  send: (params: { destination: string; amount: number }) => Promise<{ tx: unknown }>;
};

const KeetaCtx = createContext<KeetaContextValue | null>(null);

const LS_SESSION_KEY = "keeta.session.v1";
const LS_BALANCE_KEY = "keeta.lastBalance.v1";

export function KeetaProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<KeetaSession | null>(null);
  const [cachedBalance, setCachedBalance] = useState<string | number | bigint | null>(null);

  // --- hydrate from localStorage on first load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as KeetaSession;
        if (parsed?.seed && parsed?.address) {
          setSession(parsed);
        }
      }
      const b = localStorage.getItem(LS_BALANCE_KEY);
      if (b) {
        // balance might be larger than Number; keep as string
        setCachedBalance(JSON.parse(b));
      }
    } catch {
      // ignore
    }
  }, []);

  const connected = !!session;
  const address = session?.address ?? null;

  async function connectFromSeed(seedPhrase: string) {
    const seed = seedPhrase.trim();
    if (!seed) throw new Error("Please paste your mnemonic seed phrase.");

    const r = await fetch("/api/keeta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "address", seed }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error ?? "Failed to derive address");
    }
    const { address } = await r.json();
    const next: KeetaSession = { seed, address };
    setSession(next);
    // persist for refresh survival (demo)
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(next));
  }

  function disconnect() {
    setSession(null);
    setCachedBalance(null);
    try {
      localStorage.removeItem(LS_SESSION_KEY);
      localStorage.removeItem(LS_BALANCE_KEY);
    } catch {}
  }

  async function getBalance(opts?: { address?: string; token: string }) {
    if (!session && !opts?.address) {
      throw new Error("Not connected. Provide an address or connect first.");
    }
    const selAddress = (opts?.address ?? session?.address) as string;
    const token = opts?.token;
    if (!token) throw new Error("Missing token id (e.g., keeta_...)");

    const r = await fetch("/api/keeta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "balance",
        seed: session?.seed ?? "", // your server currently needs seed to init client
        address: selAddress,
        token,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error ?? "Failed to fetch balance");
    }
    const res = (await r.json()) as BalanceResult;

    // cache last balance for instant header display on refresh
    setCachedBalance(res.balance);
    try {
      localStorage.setItem(LS_BALANCE_KEY, JSON.stringify(res.balance));
    } catch {}

    return res;
  }

  async function send(params: { destination: string; amount: number }) {
    if (!session) throw new Error("Not connected");
    const { destination, amount } = params;
    if (!destination?.trim()) throw new Error("Destination required");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
    console.log(amount, "HERE???");
    const r = await fetch("/api/keeta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "send",
        seed: session.seed,
        destination: destination.trim(),
        amount,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error ?? "Send failed");
    }
    const data = await r.json();
    return { tx: data.tx ?? data };
  }

  const value = useMemo<KeetaContextValue>(
    () => ({
      connected,
      address,
      session,
      cachedBalance,
      connectFromSeed,
      disconnect,
      getBalance,
      send,
    }),
    [connected, address, session, cachedBalance]
  );

  return <KeetaCtx.Provider value={value}>{children}</KeetaCtx.Provider>;
}

export function useKeeta() {
  const ctx = useContext(KeetaCtx);
  if (!ctx) throw new Error("useKeeta must be used within KeetaProvider");
  return ctx;
}
