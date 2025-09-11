"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useKeeta } from "../../keeta/KeetaContext";

/* ---------- Types ---------- */
type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
type Card = { rank: Rank; suit: Suit; id: string };

type Phase = "idle" | "player" | "dealer" | "over";
type Outcome = "player" | "dealer" | "push" | null;

/* ---------- Deck / Shoe ---------- */
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildShoe(numDecks = 6): Card[] {
  const cards: Card[] = [];
  let uid = 0;
  for (let d = 0; d < numDecks; d++) {
    for (const s of SUITS) for (const r of RANKS) cards.push({ rank: r, suit: s, id: `${d}-${r}${s}-${uid++}` });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function drawN<T>(n: number, from: T[]) {
  const taken = from.slice(-n);
  const rest = from.slice(0, from.length - n);
  return [taken, rest] as const;
}
function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J") return 10;
  return parseInt(rank, 10);
}
function handValue(hand: Card[]) {
  let total = 0, aces = 0;
  for (const c of hand) {
    if (c.rank === "A") { aces++; total += 11; } else total += cardValue(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  const soft = hand.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  return { total, soft };
}
function isBlackjack(hand: Card[]) {
  return hand.length === 2 && handValue(hand).total === 21;
}

/* ---------- Token / House ---------- */
const BASE_TOKEN_ID = "keeta_anyiff4v34alvumupagmdyosydeq24lc4def5mrpmmyhx3j6vj2uucckeqn52";
const HOUSE_ADDRESS = process.env.NEXT_PUBLIC_HOUSE_ADDRESS || "";

type BalanceWire = { balance?: number; balanceRaw?: string | number; decimals?: number };

function humanFromRaw(raw: string | number | bigint, decimals = 9) {
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

/* ---------- Component ---------- */
export default function BlackjackPage() {
  // shoe & cut
  const [shoe, setShoe] = useState<Card[]>(() => buildShoe(6));
  const [cutIndex, setCutIndex] = useState(() => Math.floor(6 * 52 * 0.2));

  // hands
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [dealerHole, setDealerHole] = useState<Card | null>(null);

  // flow
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [message, setMessage] = useState("");
  const [settling, setSettling] = useState(false);

  // chips
  const [bet, setBet] = useState(0.25);
  const [wager, setWager] = useState(0.25);
  const [doubled, setDoubled] = useState(false);

  // wallet (page display)
  const [balance, setBalance] = useState(0);

  // funding gates
  type FundingState = false | "BET_1X" | "DOUBLE_1X";
  const [isFunding, setIsFunding] = useState<FundingState>(false);

  // derived scores
  const playerScore = useMemo(() => handValue(player), [player]);
  const dealerScore = useMemo(() => handValue(dealer), [dealer]);

  // guards
  const dealerPlayedRef = useRef(false);

  // live refs
  const playerRef = useRef<Card[]>(player);
  const dealerRef = useRef<Card[]>(dealer);
  const dealerHoleRef = useRef<Card | null>(dealerHole);
  const shoeRef = useRef<Card[]>(shoe);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { dealerRef.current = dealer; }, [dealer]);
  useEffect(() => { dealerHoleRef.current = dealerHole; }, [dealerHole]);
  useEffect(() => { shoeRef.current = shoe; }, [shoe]);

  // wallet API
  const { connected, address, getBalance, send, housePayout } = useKeeta();

  // seed balance on connect
  useEffect(() => {
    if (!connected) return;
    let stop = false;
    (async () => {
      const b = await fetchWalletBalance();
      if (!stop) setBalance(b);
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  async function fetchWalletBalance(): Promise<number> {
    try {
      const res = (await getBalance({ token: BASE_TOKEN_ID })) as BalanceWire;
      if (Number.isFinite(res?.balance as number)) return res!.balance as number;
      if (res?.balanceRaw != null) {
        return humanFromRaw(res.balanceRaw, typeof res.decimals === "number" ? res.decimals : 9);
      }
    } catch {}
    return 0;
  }

  async function escrow(amount: number, kind: "BET_1X" | "DOUBLE_1X") {
    if (!HOUSE_ADDRESS) throw new Error("House address not set");
    setIsFunding(kind);
    setMessage(kind === "BET_1X" ? `Funding ${amount.toFixed(2)} KTA…` : `Funding double ${amount.toFixed(2)} KTA…`);
    await send({ destination: HOUSE_ADDRESS, amount });  // waits until wallet approves/tx submitted
    const fresh = await fetchWalletBalance();            // reflect escrowed funds
    setBalance(fresh);
    setIsFunding(false);
    setMessage("");
  }

  /* ----- helpers ----- */
  function reshuffleIfNeeded(deck: Card[]) {
    if (deck.length <= cutIndex) {
      const fresh = buildShoe(6);
      setCutIndex(Math.floor(fresh.length * 0.2));
      shoeRef.current = fresh;
      return fresh;
    }
    return deck;
  }
  function draw1(): [Card, Card[]] {
    let deck = reshuffleIfNeeded(shoeRef.current);
    const [cards, rest] = drawN(1, deck);
    setShoe(rest);
    shoeRef.current = rest;
    return [cards[0], rest];
  }

  /* ----- Round flow ----- */

  async function startRound() {
    if (!(phase === "idle" || phase === "over")) return;

    // refresh live wallet, verify funds
    const bank = await fetchWalletBalance();
    setBalance(bank);
    if (bet > bank) { setMessage("Insufficient balance for this bet."); return; }

    // escrow 1x bet and wait until wallet approves/submits
    try {
      await escrow(bet, "BET_1X");
    } catch (e: any) {
      setIsFunding(false);
      setMessage(e?.message || "Funding failed/cancelled.");
      return;
    }

    dealerPlayedRef.current = false;
    setOutcome(null);
    setMessage("");
    setPlayer([]);
    setDealer([]);
    setDealerHole(null);
    setDoubled(false);
    setWager(bet);

    let deck = reshuffleIfNeeded(shoeRef.current);
    let draw = (n: number) => { const [cards, rest] = drawN(n, deck); deck = rest; return cards; };

    const [p1] = draw(1);
    const [dUp] = draw(1);
    const [p2] = draw(1);
    const [dHole] = draw(1);

    setShoe(deck);
    shoeRef.current = deck;

    setPlayer([p1, p2]);
    setDealer([dUp]);
    setDealerHole(dHole);
    dealerHoleRef.current = dHole;
    setPhase("player");

    const pBJ = isBlackjack([p1, p2]);
    const dBJ = isBlackjack([dUp, dHole]);
    if (pBJ || dBJ) {
      setDealer([dUp, dHole]);
      dealerRef.current = [dUp, dHole];
      setDealerHole(null);
      dealerHoleRef.current = null;
      if (pBJ && dBJ) finishRound("push");
      else if (pBJ) finishRound("player", 1.5); // 3:2
      else finishRound("dealer");
    }
  }

  function hit() {
    if (phase !== "player" || isFunding) return;
    const [c] = draw1();
    const next = [...playerRef.current, c];
    setPlayer(next);
    playerRef.current = next;
    if (handValue(next).total > 21) finishRound("dealer");
  }

  function stand() {
    if (phase !== "player" || isFunding) return;
    setPhase("dealer");
    dealerRevealAndPlay(true);
  }

  // After 1x escrowed, require ANOTHER 1x escrow before the Double draw.
  function canDouble() {
    const EPS = 1e-9;
    return phase === "player"
      && !isFunding
      && player.length === 2
      && !doubled
      && (balance + EPS) >= bet; // need a second 1x available
  }

  async function doubleDown() {
    if (!canDouble()) return;

    try {
      await escrow(bet, "DOUBLE_1X");
    } catch (e: any) {
      setIsFunding(false);
      setMessage(e?.message || "Double funding failed/cancelled.");
      return;
    }

    setWager((w) => w + bet);
    setDoubled(true);

    const [c] = draw1();
    const next = [...playerRef.current, c];
    setPlayer(next);
    playerRef.current = next;

    if (handValue(next).total > 21) {
      finishRound("dealer");
    } else {
      setPhase("dealer");
      dealerRevealAndPlay(true);
    }
  }

  function dealerRevealAndPlay(immediate = false) {
    if (dealerPlayedRef.current) return;
    dealerPlayedRef.current = true;

    const hole = dealerHoleRef.current;
    if (hole) {
      const revealed = [...dealerRef.current, hole];
      setDealer(revealed);
      dealerRef.current = revealed;
      setDealerHole(null);
      dealerHoleRef.current = null;
    }

    const run = () => {
      let deck = shoeRef.current.slice();
      let d = dealerRef.current.slice();

      const standOnSoft17 = true;
      while (true) {
        const { total, soft } = handValue(d);
        if (total > 17) break;
        if (total === 17) {
          if (soft && standOnSoft17) break;
          if (!soft) break;
        }
        deck = reshuffleIfNeeded(deck);
        const [take, rest] = drawN(1, deck);
        d = [...d, take[0]];
        deck = rest;
      }

      setShoe(deck);           shoeRef.current = deck;
      setDealer(d);            dealerRef.current = d;

      const p = handValue(playerRef.current).total;
      const dv = handValue(d).total;
      if (dv > 21) finishRound("player");
      else if (p > dv) finishRound("player");
      else if (p < dv) finishRound("dealer");
      else finishRound("push");
    };

    if (immediate) run();
    else setTimeout(run, 200);
  }

  // With escrow model:
  // - Dealer win: house keeps escrowed stake(s) -> NO player->house send here.
  // - Player win: house pays back stake(s) + winnings.
  // - Push: house refunds stake(s).
  async function finishRound(winner: Outcome, blackjackPayout = 1) {
    setPhase("over");
    setOutcome(winner);

    if (winner === "player") {
      setMessage(blackjackPayout === 1.5 ? "Blackjack! You win 3:2." : "You win!");
    } else if (winner === "push") {
      setMessage("Push.");
    } else {
      setMessage("Dealer wins.");
    }

    if (!connected) return;
    const usedStake = bet * (doubled ? 2 : 1);

    try {
      setSettling(true);

      if (winner === "player") {
        // Regular win pays 2x used stake; blackjack pays 2.5x base bet (BJ can't happen after double).
        const payout = doubled
          ? 2 * usedStake                           // 4x bet total back (refund 2x + win 2x)
          : (blackjackPayout === 1.5 ? 2.5 * bet : 2 * bet);
        if (!address) throw new Error("No player address");
        await housePayout({ to: address, amount: payout });
      } else if (winner === "push") {
        // Refund escrowed stake(s)
        if (!address) throw new Error("No player address");
        await housePayout({ to: address, amount: usedStake });
      }
      // Dealer win → house keeps escrow; nothing to send.
    } catch (e) {
      console.error("[settlement] error", e);
      setMessage((m) => `${m}\n(Settlement error: see console)`);
    } finally {
      setSettling(false);
      // Refresh wallet to reflect post-settlement reality
      const fresh = await fetchWalletBalance();
      setBalance(fresh);
    }
  }

  function newRound() {
    setPhase("idle");
    setOutcome(null);
    setMessage("");
    setPlayer([]); playerRef.current = [];
    setDealer([]); dealerRef.current = [];
    setDealerHole(null); dealerHoleRef.current = null;
    setDoubled(false);
  }

  /* ----- UI helpers (typed) ----- */
  type BadgeTone = "default" | "brand" | "danger" | "muted";
  function Badge({ children, tone = "default" }: PropsWithChildren<{ tone?: BadgeTone }>) {
    const tones: Record<BadgeTone, string> = {
      default: "bg-white/5 border-white/10 text-white/90",
      brand: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
      danger: "bg-red-500/10 border-red-400/30 text-red-200",
      muted: "bg-white/5 border-white/10 text-white/60",
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${tones[tone]} shadow-sm`}>
        {children}
      </span>
    );
  }

  function Score({ total, soft }: { total: number; soft: boolean }) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs">
        <span className="opacity-70">Score</span>
        <span className="font-semibold text-white">{total}</span>
        {soft && <span className="px-1.5 rounded bg-white/10 text-[10px] tracking-wide">SOFT</span>}
      </div>
    );
  }

  function CardView({ c, hidden = false }: { c: Card; hidden?: boolean }) {
    const isRed = c.suit === "♥" || c.suit === "♦";
    if (hidden) {
      return (
        <div className="w-12 h-16 sm:w-[3.25rem] sm:h-[4.5rem] rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-600 border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)] grid place-items-center">
          <span className="text-xs text-white/70">🂠</span>
        </div>
      );
    }
    return (
      <div className="w-12 h-16 sm:w-[3.25rem] sm:h-[4.5rem] rounded-xl bg-white text-black border border-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.25)] grid place-items-center">
        <div className={`text-sm sm:text-base font-extrabold tracking-tight ${isRed ? "text-red-600" : "text-zinc-900"}`}>
          {c.rank}<span className="ml-0.5">{c.suit}</span>
        </div>
      </div>
    );
  }

  // strictly-boolean UI guards (fixes TS2322 on disabled)
  const isBusy: boolean = isFunding !== false;
  const canDeal: boolean = (phase === "idle" || phase === "over") && !isBusy;
  const canAct: boolean = phase === "player" && !isBusy;

  /* ---------- UI ---------- */
  return (
    <section
      className="min-h-[calc(100vh-6rem)] w-full"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(16,185,129,0.25), rgba(2,6,23,0))," +
          "radial-gradient(800px 400px at 100% 0%, rgba(16,185,129,0.12), rgba(2,6,23,0))",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-1.5">
              <span className="text-emerald-200 text-xs tracking-wider">TABLE</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Blackjack</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="brand">Balance: <span className="font-semibold ml-1">{balance.toFixed(2)} KTA</span></Badge>
            <Badge>Bet: <span className="font-semibold ml-1">{bet.toFixed(2)} KTA</span>{doubled && <span className="ml-2 rounded bg-emerald-500/15 px-1.5">Doubled</span>}</Badge>
          </div>
        </div>

        {/* Table & Sidebar */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Felt table */}
          <div
            className="relative overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-b from-emerald-950/60 to-emerald-900/30 p-5"
          >
            {/* subtle rim light */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
            {/* Dealer Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone="muted">Dealer</Badge>
                {phase === "player" ? (
                  <span className="text-xs text-white/60">Score: <span className="font-semibold text-white">?</span></span>
                ) : (
                  <Score total={dealerScore.total} soft={dealerScore.soft} />
                )}
              </div>
              {phase === "player" && (
                <div className="text-[11px] uppercase tracking-wider text-white/60">
                  Dealer shows
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 min-h-[4.5rem]">
              {dealer.length === 0 && !dealerHole && (
                <div className="h-[4.5rem] grid place-items-center text-white/40 text-sm">—</div>
              )}
              {dealer.map((c) => (<CardView key={c.id} c={c} />))}
              {phase === "player" && dealerHole && (<CardView key={dealerHole.id} c={dealerHole} hidden />)}
            </div>

            {/* Divider arc */}
            <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Player Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone="muted">You</Badge>
                <Score total={playerScore.total} soft={playerScore.soft} />
              </div>
              <div className="text-xs text-white/60">
                Wager: <span className="text-white font-semibold">{wager.toFixed(2)} KTA</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 min-h-[4.5rem]">
              {player.length === 0 && (
                <div className="h-[4.5rem] grid place-items-center text-white/40 text-sm">—</div>
              )}
              {player.map((c) => (<CardView key={c.id} c={c} />))}
            </div>

            {/* Action Bar */}
            <div className="mt-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  className={`relative overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold tracking-wide backdrop-blur
                    shadow-[0_8px_20px_rgba(0,0,0,0.25)]
                    ${canDeal ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950" : "bg-white/5 text-white/40 cursor-not-allowed"}`}
                  onClick={startRound}
                  disabled={!canDeal || bet <= 0 || balance < bet}
                >
                  {isFunding === "BET_1X" ? "Funding…" : "Deal"}
                </button>

                <button
                  className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide backdrop-blur
                    shadow-[0_8px_20px_rgba(0,0,0,0.25)]
                    ${canAct ? "bg-white/10 hover:bg-white/15 text-white" : "bg-white/5 text-white/40"}`}
                  onClick={hit}
                  disabled={!canAct}
                >
                  Hit
                </button>

                <button
                  className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide backdrop-blur
                    shadow-[0_8px_20px_rgba(0,0,0,0.25)]
                    ${canAct ? "bg-white/10 hover:bg-white/15 text-white" : "bg-white/5 text-white/40"}`}
                  onClick={stand}
                  disabled={!canAct}
                >
                  Stand
                </button>

                <button
                  className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide backdrop-blur
                    shadow-[0_8px_20px_rgba(0,0,0,0.25)]
                    ${canDouble() ? "bg-white/10 hover:bg-white/15 text-white" : "bg-white/5 text-white/40"}`}
                  onClick={doubleDown}
                  disabled={!canDouble()}
                >
                  {isFunding === "DOUBLE_1X" ? "Funding…" : "Double"}
                </button>

                <button
                  className={`rounded-xl px-4 py-3 text-sm font-semibold tracking-wide backdrop-blur
                    shadow-[0_8px_20px_rgba(0,0,0,0.25)]
                    ${phase === "over" ? "bg-zinc-700/50 hover:bg-zinc-600/50 text-white" : "bg-white/5 text-white/40"}`}
                  onClick={newRound}
                  disabled={phase !== "over"}
                >
                  New Round
                </button>
              </div>

              {message && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/90 whitespace-pre-line">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400/80" />
                    <span>{message}</span>
                    {settling && <span className="ml-2 text-xs text-white/60">Settling…</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 lg:p-5 backdrop-blur-sm">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold tracking-wide text-white/80">Bet Size</div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[0.1, 0.25, 0.5, 1].map((b) => (
                    <button
                      key={b}
                      className={`relative overflow-hidden rounded-xl px-3 py-2 text-sm font-semibold tracking-wide
                        ${bet === b
                          ? "bg-emerald-500 text-emerald-950 shadow-[0_10px_24px_rgba(16,185,129,0.35)]"
                          : "bg-white/10 hover:bg-white/15 text-white/90 border border-white/10"}`}
                      onClick={() => setBet(b)}
                      disabled={!((phase === "idle" || phase === "over") && !isBusy)}
                    >
                      {b} KTA
                    </button>
                  ))}
                </div>
                {!(phase === "idle" || phase === "over") && (
                  <div className="mt-2 text-xs text-white/50">Bet locked. Finish or cancel the round to change it.</div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/70 leading-relaxed">
                  <div>Rules: <span className="text-white">3:2 blackjack</span>, dealer stands on <span className="text-white">soft 17</span>, no splits (yet).</div>
                  <div className="mt-1">Escrow required before deal and before Double.</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4 bg-gradient-to-br from-white/[0.04] to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">Cut card penetration</span>
                  <span className="text-xs text-white/90">{Math.round((1 - cutIndex / (6 * 52)) * 100)}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-emerald-400/80"
                    style={{ width: `${Math.min(100, Math.max(0, Math.round((1 - cutIndex / (6 * 52)) * 100)))}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
