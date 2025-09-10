"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type BalanceResult = {
  balance?: number;                 // human (preferred)
  balanceRaw?: string | number;     // raw base units (fallback)
  decimals?: number;                // usually 9
};

export type KeetaSession = {
  seed: string;    // mnemonic seed phrase (kept in memory + demo localStorage)
  address: string; // derived public address
};

type KeetaContextValue = {
  connected: boolean;
  address: string | null;
  session: KeetaSession | null;

  connectFromSeed: (seedPhrase: string) => Promise<void>;
  createWallet: () => Promise<void>;
  disconnect: () => void;

  getBalance: (opts: { address?: string; token: string }) => Promise<BalanceResult>;
  send: (params: { destination: string; amount: number }) => Promise<{ tx: unknown }>;
  housePayout: (params: { to: string; amount: number }) => Promise<{ success: boolean }>;
};

const KeetaCtx = createContext<KeetaContextValue | null>(null);

export function KeetaProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<KeetaSession | null>(null);

  // demo persistence (safe-ish for testnet only)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("keeta.session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      if (session) localStorage.setItem("keeta.session", JSON.stringify(session));
      else localStorage.removeItem("keeta.session");
    } catch {}
  }, [session]);

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
    setSession({ seed, address });
  }

  async function createWallet() {
    const r = await fetch("/api/keeta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "create" }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error ?? "Failed to create wallet");
    }
    const { seed, address } = await r.json();
    setSession({ seed, address });
  }

  function disconnect() {
    setSession(null);
  }

  async function getBalance(opts: { address?: string; token: string }) {
    if (!session && !opts?.address) {
      throw new Error("Not connected. Provide an address or connect first.");
    }
    const addr = (opts?.address ?? session?.address) as string;
    const token = opts?.token;
    if (!token) throw new Error("Missing token id (e.g., keeta_...)");

    const r = await fetch("/api/keeta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        op: "balance",
        seed: session?.seed ?? "",
        address: addr,
        token,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error ?? "Failed to fetch balance");
    }
    return (await r.json()) as BalanceResult;
  }

  async function send(params: { destination: string; amount: number }) {
    if (!session) throw new Error("Not connected");
    const { destination, amount } = params;
    if (!destination?.trim()) throw new Error("Destination required");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

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
    // works with { success:true } or any tx payload
    return { tx: data.tx ?? data };
  }

  async function housePayout(params: { to: string; amount: number }) {
    const { to, amount } = params;
    const r = await fetch("/api/keeta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "payout", to, amount }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.log(err);
      throw new Error(err?.error ?? "Payout failed");
    }
    const data = await r.json();
    return { success: !!data?.success };
  }

  const value = useMemo<KeetaContextValue>(
    () => ({
      connected,
      address,
      session,
      connectFromSeed,
      createWallet,
      disconnect,
      getBalance,
      send,
      housePayout,
    }),
    [connected, address, session]
  );

  return <KeetaCtx.Provider value={value}>{children}</KeetaCtx.Provider>;
}

export function useKeeta() {
  const ctx = useContext(KeetaCtx);
  if (!ctx) throw new Error("useKeeta must be used within KeetaProvider");
  return ctx;
}
