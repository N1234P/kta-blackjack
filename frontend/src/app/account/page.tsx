"use client";

import { useState } from "react";
import { useKeeta } from "../../keeta/KeetaContext";

const BASE_TOKEN_ID =
  "keeta_anyiff4v34alvumupagmdyosydeq24lc4def5mrpmmyhx3j6vj2uucckeqn52";

// ---- balance wire + helpers (same idea as header) ----
type BalanceResult = {
  balance?: number;                 // human (preferred)
  balanceRaw?: string | number;     // raw base units (fallback)
  decimals?: number;                // usually 9
};

function humanFromRaw(raw: string | number | bigint, decimals = 9): number {
  let n: bigint;
  if (typeof raw === "bigint") n = raw;
  else if (typeof raw === "number") n = BigInt(Math.trunc(raw));
  else n = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;
  const fracStrFull = (frac + base).toString().slice(1).padStart(Number(decimals), "0");
  return Number(`${whole}.${fracStrFull}`);
}

export default function AccountPage() {
  const { connected, address, connectFromSeed, getBalance, send, disconnect, createWallet } = useKeeta();

  // import / create
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // balance (store HUMAN number or null)
  const [balance, setBalance] = useState<number | null>(null);

  // send form
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("2");
  const [lastTx, setLastTx] = useState<any>(null);

  async function wrap<T>(fn: () => Promise<T>) {
    setBusy(true);
    setNote(null);
    try {
      return await fn();
    } catch (e: any) {
      setNote(e?.message ?? "Something went wrong.");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    await wrap(async () => {
      await connectFromSeed(seed);
      setNote("Wallet connected.");
    });
  }

  async function handleCreateWallet() {
    await wrap(async () => {
      await createWallet();
      setNote("New wallet created and connected.");
    });
  }

  async function handleGetBalance() {
    await wrap(async () => {
      const res = (await getBalance({ token: BASE_TOKEN_ID })) as BalanceResult;

      const human =
        typeof res?.balance === "number"
          ? res.balance
          : res?.balanceRaw != null
          ? humanFromRaw(res.balanceRaw, typeof res.decimals === "number" ? res.decimals : 9)
          : null;

      setBalance(human);
      setNote(human != null ? "Balance fetched." : "Balance unavailable.");
    });
  }

  async function handleSend() {
    await wrap(async () => {
      const res = await send({ destination, amount: Number(amount) });
      setLastTx(res?.tx ?? res);
      setNote("Transaction submitted.");
    });
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Account / Connect Wallet</h1>

      {/* Connect / Create */}
      {!connected && (
        <div className="card p-4 space-y-3">
          <label className="text-sm text-[--color-muted]">Paste your mnemonic seed phrase</label>
          <textarea
            className="w-full rounded-lg bg-white/10 px-3 py-2"
            rows={3}
            placeholder="word1 word2 … word12 (Keeta seed phrase)"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-brand hover:opacity-90 disabled:opacity-50"
              disabled={!seed.trim() || busy}
              onClick={handleImport}
            >
              Import & Connect
            </button>
            <button
              className="btn bg-white/10 hover:bg-brand/60 disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                setSeed("");
                setNote(null);
              }}
            >
              Clear
            </button>
            <button
              className="btn bg-white/10 hover:bg-brand/60 disabled:opacity-50"
              disabled={busy}
              onClick={handleCreateWallet}
              title="Generate a brand new testnet wallet"
            >
              Create New Wallet
            </button>
          </div>
          {note && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">{note}</div>
          )}
        </div>
      )}

      {/* Connected wallet actions */}
      {connected && (
        <div className="card p-4 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-[--color-muted]">Connected Address</div>
              <div className="font-mono break-anywhere">{address}</div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn bg-white/10 hover:bg-brand/60"
                onClick={() => navigator.clipboard.writeText(address ?? "")}
              >
                Copy
              </button>
              <button
                className="btn bg-white/10 hover:bg-brand/60"
                onClick={() => {
                  disconnect();
                  setBalance(null);
                  setLastTx(null);
                }}
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="space-y-3">
            <div className="text-sm font-medium">KTA Balance</div>
            <button
              className="btn bg-white/10 hover:bg-brand/60 disabled:opacity-50"
              onClick={handleGetBalance}
              disabled={busy}
            >
              Get Balance
            </button>
            {balance !== null && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                Balance: <span className="font-mono">{balance.toFixed(4).replace(/\.?0+$/, "")}</span>
              </div>
            )}
          </div>

          {/* Send */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Send KTA</div>
            <div className="grid gap-3 md:grid-cols-[1fr,140px,140px]">
              <input
                className="rounded-lg bg-white/10 px-3 py-2"
                placeholder="Destination public key"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              <input
                className="rounded-lg bg-white/10 px-3 py-2"
                placeholder="Amount (e.g. 2)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="btn btn-brand hover:opacity-90 disabled:opacity-50"
                onClick={handleSend}
                disabled={!destination.trim() || Number(amount) <= 0 || busy}
              >
                Send
              </button>
            </div>
            {lastTx && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm break-anywhere">
                <div className="text-[--color-muted]">Last TX (response):</div>
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(lastTx, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {note && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">{note}</div>
          )}
          <p className="text-xs text-[--color-muted]">
            Using <code>{BASE_TOKEN_ID}</code> as the default KTA token.
          </p>
        </div>
      )}
    </section>
  );
}
