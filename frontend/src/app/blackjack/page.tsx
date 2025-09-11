// app/blackjack/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useKeeta } from "../../keeta/KeetaContext";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
type Card = { rank: Rank; suit: Suit; id: string };
type Phase = "awaiting_escrow" | "player" | "dealer" | "over";
type Outcome = "player" | "dealer" | "push" | null;

type PublicState = {
  id: string; address: string; bet: number; doubled: boolean; phase: Phase; shoeHash: string;
  player: Card[]; dealer: Card[]; escrowCount: 0 | 1 | 2; outcome: Outcome; payout: number; updatedAt: number;
};

type BalanceWire = { balance?: number; balanceRaw?: string | number; decimals?: number };
const BASE_TOKEN_ID = "keeta_anyiff4v34alvumupagmdyosydeq24lc4def5mrpmmyhx3j6vj2uucckeqn52";

function cardValue(rank: Rank): number { if (rank === "A") return 11; if (rank === "K" || rank === "Q" || rank === "J") return 10; return parseInt(rank, 10); }
function handValue(hand: Card[]) {
  let total = 0, aces = 0;
  for (const c of hand) { if (c.rank === "A") { aces++; total += 11; } else total += cardValue(c.rank); }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  const soft = hand.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  return { total, soft };
}
function humanFromRaw(raw: string | number | bigint, decimals = 9) {
  let n: bigint; if (typeof raw === "bigint") n = raw; else if (typeof raw === "number") n = BigInt(Math.trunc(raw)); else n = BigInt(raw);
  const base = 10n ** BigInt(decimals); const whole = n / base; const frac = n % base;
  const fracStrFull = (frac + base).toString().slice(1).padStart(Number(decimals), "0");
  return Number(`${whole}.${fracStrFull}`);
}
function cryptoRandomSeed() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const a = new Uint32Array(4); window.crypto.getRandomValues(a);
    return Array.from(a).map(x => x.toString(16).padStart(8, "0")).join("");
  }
  return Math.random().toString(16).slice(2);
}

export default function BlackjackPage() {
  const { connected, address, getBalance, send } = useKeeta();

  const [bet, setBet] = useState(0.25);
  const [balance, setBalance] = useState(0);
  const [isFunding, setIsFunding] = useState<false | "BET_1X" | "DOUBLE_1X">(false);

  const [roundId, setRoundId] = useState<string | null>(null);
  const [state, setState] = useState<PublicState | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!connected) return; (async () => setBalance(await fetchWalletBalance()))(); /* eslint-disable-next-line */ }, [connected]);

  async function fetchWalletBalance(): Promise<number> {
    try {
      const res = (await getBalance({ token: BASE_TOKEN_ID })) as BalanceWire;
      if (Number.isFinite(res?.balance as number)) return res!.balance as number;
      if (res?.balanceRaw != null) return humanFromRaw(res.balanceRaw, typeof res.decimals === "number" ? res.decimals : 9);
    } catch {}
    return 0;
  }

  async function startRound() {
    if (!connected || !address) { setMessage("Connect your wallet"); return; }
    setLoading(true); setMessage("");

    try {
      const clientSeed = cryptoRandomSeed();
      const startRes = await fetch("/api/blackjack/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, clientSeed, address }),
      }).then(r => r.json());
      if (startRes?.error) throw new Error(startRes.error);

      const { roundId: id, escrowIntent } = startRes as { roundId: string; escrowIntent: { to: string; amount: number; memo: string } };
      setRoundId(id);

      // 1x escrow with memo
      setIsFunding("BET_1X");
      const result = await send({ destination: escrowIntent.to, amount: escrowIntent.amount, memo: escrowIntent.memo });
      setIsFunding(false);

      // notify server (txId is optional, server will verify by memo if supported)
      await fetch("/api/blackjack/escrow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: id, step: 1, txId: (result as any)?.txId }),
      });

      // deal
      const dealt = await action(id, "deal");
      setState(dealt);
      setBalance(await fetchWalletBalance());
    } catch (e: any) {
      setMessage(e?.message || "Failed to start round");
    } finally {
      setLoading(false);
    }
  }

  async function action(id: string, action: "deal" | "hit" | "stand" | "double") {
    const res = await fetch("/api/blackjack/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId: id, action }),
    }).then(r => r.json());
    if (res?.error) throw new Error(res.error);
    setState(res.state as PublicState);
    if ((res.state as PublicState).phase === "over") setBalance(await fetchWalletBalance());
    return res.state as PublicState;
  }

  async function onHit() { if (!roundId) return; try { await action(roundId, "hit"); } catch (e: any) { setMessage(e?.message || "Hit failed"); } }
  async function onStand() { if (!roundId) return; try { await action(roundId, "stand"); } catch (e: any) { setMessage(e?.message || "Stand failed"); } }
  async function onDouble() {
    if (!roundId || !state) return;
    try {
      const memo = `bj:${roundId}:2x`;
      setIsFunding("DOUBLE_1X");
      const res = await send({ destination: process.env.NEXT_PUBLIC_HOUSE_ADDRESS || "", amount: state.bet, memo });
      setIsFunding(false);

      await fetch("/api/blackjack/escrow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, step: 2, txId: (res as any)?.txId }),
      });

      await action(roundId, "double");
    } catch (e: any) {
      setIsFunding(false); setMessage(e?.message || "Double failed");
    }
  }

  function newRoundLocal() { setRoundId(null); setState(null); setMessage(""); }

  const playerScore = useMemo(() => handValue(state?.player || []), [state?.player]);
  const dealerScore = useMemo(() => handValue(state?.dealer || []), [state?.dealer]);
  const canDeal = !loading && !state?.id;
  const canAct = state?.phase === "player" && !loading && isFunding === false;
  const canDouble = state?.phase === "player" && state?.player?.length === 2 && state?.doubled === false && isFunding === false;

  function Score({ total, soft }: { total: number; soft: boolean }) {
    return (<div className="text-sm">Score: <span className="font-semibold">{total}</span>{soft && <span className="ml-1 text-[--color-muted]">(soft)</span>}</div>);
  }
  function CardView({ c, hidden = false }: { c: Card; hidden?: boolean }) {
    const isRed = c.suit === "♥" || c.suit === "♦";
    return hidden ? (
      <div className="w-11 h-16 sm:w-12 sm:h-16 rounded-lg bg-[--color-border] border border-white/10 grid place-items-center">
        <span className="text-xs text-[--color-muted]">🂠</span>
      </div>
    ) : (
      <div className="w-11 h-16 sm:w-12 sm:h-16 rounded-lg bg-white text-black border border-black/10 shadow grid place-items-center">
        <div className={`text-sm font-bold ${isRed ? "text-red-600" : "text-black"}`}>{c.rank}<span className="ml-0.5">{c.suit}</span></div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Blackjack</h1>
          <div className="flex items-center gap-3 text-sm">
            <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10">Balance: <span className="font-semibold">{balance.toFixed(2)} KTA</span></div>
            <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10">Bet: <span className="font-semibold">{(state?.bet ?? bet).toFixed(2)} KTA</span>{state?.doubled && <span className="ml-2 text-xs text-emerald-300">Doubled</span>}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr,320px]">
          <div className="card p-4 min-w-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[--color-muted]">Dealer</div>
              {state?.phase === "player" ? (<div className="text-sm">Score: <span className="font-semibold">?</span></div>) : (<Score total={dealerScore.total} soft={dealerScore.soft} />)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(state?.dealer?.length ?? 0) === 0 && (<div className="h-16 grid place-items-center text-[--color-muted]">—</div>)}
              {(state?.dealer || []).map((c, i) => <CardView key={c.id} c={c} hidden={state?.phase === "player" && i === 1} />)}
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-[--color-muted]">You</div>
              <Score total={playerScore.total} soft={playerScore.soft} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(state?.player?.length ?? 0) === 0 && (<div className="h-16 grid place-items-center text-[--color-muted]">—</div>)}
              {(state?.player || []).map((c) => (<CardView key={c.id} c={c} />))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button className={`btn transition-colors ${canDeal ? "btn-brand hover:opacity-90" : "bg-white/10 text-zinc-500 cursor-not-allowed"}`} onClick={startRound} disabled={!canDeal || bet <= 0 || !connected}>
                {isFunding === "BET_1X" ? "Funding…" : "Deal"}
              </button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={onHit} disabled={!canAct}>Hit</button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={onStand} disabled={!canAct}>Stand</button>
              <button className="btn bg-white/10 hover:bg-brand/60 disabled:opacity-50" onClick={onDouble} disabled={!canDouble}>
                {isFunding === "DOUBLE_1X" ? "Funding…" : "Double"}
              </button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={newRoundLocal} disabled={state?.phase !== "over"}>New Round</button>
            </div>

            {message && (<div className="mt-4 whitespace-pre-line rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">{message}</div>)}

            {state?.phase === "over" && (
              <div className="mt-4 text-sm">
                Result: {state.outcome === "player" ? <span className="text-emerald-300">You win</span> : state.outcome === "dealer" ? <span className="text-red-300">Dealer wins</span> : <span className="text-white/80">Push</span>}
                {state.payout > 0 && (<span className="ml-2 text-white/70">Payout: {state.payout.toFixed(2)} KTA</span>)}
              </div>
            )}
          </div>

          <aside className="card p-4 space-y-4 min-w-0">
            <div>
              <div className="text-sm font-medium">Bet Size</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.1, 0.25, 0.5, 1].map((b) => (
                  <button key={b} className={`btn text-sm ${(!state || state.phase === "over") && bet === b ? "btn-brand hover:opacity-90" : "bg-white/10 hover:bg-brand/60"}`} onClick={() => setBet(b)} disabled={!!state && state.phase !== "over"}>
                    {b} KTA
                  </button>
                ))}
              </div>
              {state && state.phase !== "over" && <div className="mt-2 text-xs text-[--color-muted]">Bet locked. Finish the round to change it.</div>}
            </div>
            <div className="text-xs text-[--color-muted]">
              <div>Rules: 3:2 blackjack, dealer stands on soft 17.</div>
              <div className="mt-1">Server-authoritative dealing & payouts. Shoe hash: <span className="font-mono">{state?.shoeHash?.slice(0, 12)}…</span></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
