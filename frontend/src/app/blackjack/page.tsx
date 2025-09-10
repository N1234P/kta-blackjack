"use client";

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
  // Fisher–Yates shuffle
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
  // "soft" if there's at least one Ace currently counted as 11
  const soft = hand.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  return { total, soft };
}
function isBlackjack(hand: Card[]) {
  return hand.length === 2 && handValue(hand).total === 21;
}

/* ---------- Balance helpers ---------- */
const BASE_TOKEN_ID = "keeta_anyiff4v34alvumupagmdyosydeq24lc4def5mrpmmyhx3j6vj2uucckeqn52";
const HOUSE_ADDRESS = process.env.NEXT_PUBLIC_HOUSE_ADDRESS || "";

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
type BalanceWire = { balance?: number; balanceRaw?: string | number; decimals?: number };

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
  const [balance, setBalance] = useState(0); // hydrated from wallet
  const [wager, setWager] = useState(0.25);
  const [doubled, setDoubled] = useState(false);

  // derived
  const playerScore = useMemo(() => handValue(player), [player]);
  const dealerScore = useMemo(() => handValue(dealer), [dealer]);

  // guards
  const dealerPlayedRef = useRef(false);

  // ---- NEW: live refs to avoid stale-closure bugs (esp. after Double) ----
  const playerRef = useRef<Card[]>(player);
  const dealerRef = useRef<Card[]>(dealer);
  const dealerHoleRef = useRef<Card | null>(dealerHole);
  const shoeRef = useRef<Card[]>(shoe);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { dealerRef.current = dealer; }, [dealer]);
  useEffect(() => { dealerHoleRef.current = dealerHole; }, [dealerHole]);
  useEffect(() => { shoeRef.current = shoe; }, [shoe]);

  // wallet sync
  const { connected, address, getBalance, send, housePayout } = useKeeta();
  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (!connected) return;
      try {
        const res = (await getBalance({ token: BASE_TOKEN_ID })) as BalanceWire;
        let human: number | null = Number.isFinite(res?.balance as number) ? (res!.balance as number) : null;
        if (human == null && res?.balanceRaw != null) {
          human = humanFromRaw(res.balanceRaw, typeof res.decimals === "number" ? res.decimals : 9);
        }
        if (!stop && human != null) {
          const roundIdle = phase === "idle" || phase === "over";
          if (roundIdle) setBalance(human);
        }
      } catch {}
    };
    load();
    return () => { stop = true; };
  }, [connected, phase, getBalance]);

  /* ----- helpers ----- */
  function reshuffleIfNeeded(deck: Card[]) {
    if (deck.length <= cutIndex) {
      const fresh = buildShoe(6);
      setCutIndex(Math.floor(fresh.length * 0.2));
      shoeRef.current = fresh; // keep ref hot
      return fresh;
    }
    return deck;
  }
  function draw1(): [Card, Card[]] {
    let deck = reshuffleIfNeeded(shoeRef.current);
    const [cards, rest] = drawN(1, deck);
    setShoe(rest);
    shoeRef.current = rest; // keep ref hot
    return [cards[0], rest];
  }

  function startRound() {
    if (!(phase === "idle" || phase === "over")) return;
    if (bet > balance) { setMessage("Insufficient balance for this bet."); return; }

    dealerPlayedRef.current = false;
    setOutcome(null);
    setMessage("");
    setPlayer([]);
    setDealer([]);
    setDealerHole(null);
    setDoubled(false);

    setWager(bet);
    setBalance((b) => b - bet);

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
      else if (pBJ) finishRound("player", 1.5);
      else finishRound("dealer");
    }
  }

  function hit() {
    if (phase !== "player") return;
    const [c] = draw1();
    const next = [...playerRef.current, c];
    setPlayer(next);
    playerRef.current = next;
    if (handValue(next).total > 21) finishRound("dealer");
  }

  function stand() {
    if (phase !== "player") return;
    setPhase("dealer");
    dealerRevealAndPlay();
  }

  // safer double guard for floats
function canDouble() {
  const EPS = 1e-9;
  return phase === "player" && player.length === 2 && !doubled && (balance + EPS) >= bet;
}


  function doubleDown() {
    if (!canDouble()) return;
    setBalance((b) => b - bet);
    setWager((w) => w + bet);
    setDoubled(true);

    const [c] = draw1();
    const next = [...playerRef.current, c];
    setPlayer(next);
    playerRef.current = next;

    if (handValue(next).total > 21) {
      finishRound("dealer");              // bust after double
    } else {
      setPhase("dealer");
      dealerRevealAndPlay(true);
    }
  }

  function dealerRevealAndPlay(immediate=false) {
    if (dealerPlayedRef.current) return;
    dealerPlayedRef.current = true;

    // reveal hole from live ref
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
          if (soft && standOnSoft17) break; // stand soft-17
          if (!soft) break;                  // stand hard-17
        }
        deck = reshuffleIfNeeded(deck);
        const [take, rest] = drawN(1, deck);
        d = [...d, take[0]];
        deck = rest;
      }

      // commit end state
      setShoe(deck);           shoeRef.current = deck;
      setDealer(d);            dealerRef.current = d;

      const p = handValue(playerRef.current).total;
      const dv = handValue(d).total;
      if (dv > 21) finishRound("player");
      else if (p > dv) finishRound("player");
      else if (p < dv) finishRound("dealer");
      else finishRound("push");
    };

    // keep the tiny delay for normal play if you like the animation feel
    if (immediate) run();
    else setTimeout(run, 200);
}

  async function finishRound(winner: Outcome, blackjackPayout = 1) {
    setPhase("over");
    setOutcome(winner);

    // local table balance
    if (winner === "player") {
      setBalance((b) => b + wager * (1 + blackjackPayout));
      setMessage(blackjackPayout === 1.5 ? "Blackjack! You win 3:2." : "You win!");
    } else if (winner === "push") {
      setBalance((b) => b + wager);
      setMessage("Push.");
    } else {
      setMessage("Dealer wins.");
    }

    // on-chain settlement (best-effort)
    if (!connected) return;

    try {
      setSettling(true);
      if (winner === "dealer") {
        if (!HOUSE_ADDRESS) throw new Error("House address not set");
        // player → house (wager)
        await send({ destination: HOUSE_ADDRESS, amount: wager });
      } else if (winner === "player") {
        if (!address) throw new Error("No player address");
        // house → player (net winnings)
        const netWin = blackjackPayout === 1.5 ? wager * 1.5 : wager;
        await housePayout({ to: address, amount: netWin });
      }
      // push → no transfer
    } catch (e) {
      console.error("[settlement] error", e);
      setMessage((m) => `${m}\n(Settlement error: see console)`);
    } finally {
      setSettling(false);
    }
  }

  function newRound() {
    setPhase("idle");
    setOutcome(null);
    setMessage("");
    setPlayer([]);
    playerRef.current = [];
    setDealer([]);
    dealerRef.current = [];
    setDealerHole(null);
    dealerHoleRef.current = null;
    setDoubled(false);
  }

  /* ----- UI helpers ----- */
  function Score({ total, soft }: { total: number; soft: boolean }) {
    return (
      <div className="text-sm">
        Score: <span className="font-semibold">{total}</span>
        {soft && <span className="ml-1 text-[--color-muted]">(soft)</span>}
      </div>
    );
  }
  function CardView({ c, hidden = false }: { c: Card; hidden?: boolean }) {
    const isRed = c.suit === "♥" || c.suit === "♦";
    if (hidden) {
      return (
        <div className="w-11 h-16 sm:w-12 sm:h-16 rounded-lg bg-[--color-border] border border-white/10 grid place-items-center">
          <span className="text-xs text-[--color-muted]">🂠</span>
        </div>
      );
    }
    return (
      <div className="w-11 h-16 sm:w-12 sm:h-16 rounded-lg bg-white text-black border border-black/10 shadow grid place-items-center">
        <div className={`text-sm font-bold ${isRed ? "text-red-600" : "text-black"}`}>
          {c.rank}<span className="ml-0.5">{c.suit}</span>
        </div>
      </div>
    );
  }

  const canDeal = phase === "idle" || phase === "over";
  const canAct = phase === "player";

  return (
    <section className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Blackjack</h1>
          <div className="flex items-center gap-3 text-sm">
            <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10">
              Balance: <span className="font-semibold">{balance.toFixed(2)} KTA</span>
            </div>
            <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10">
              Bet: <span className="font-semibold">{bet.toFixed(2)} KTA</span>
            </div>
          </div>
        </div>

        {/* table + sidebar */}
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr,320px]">
          <div className="card p-4 min-w-0">
            {/* Dealer */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-[--color-muted]">Dealer</div>
              {phase === "player" ? (
                <div className="text-sm">Score: <span className="font-semibold">?</span></div>
              ) : (
                <Score total={dealerScore.total} soft={dealerScore.soft} />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {dealer.length === 0 && !dealerHole && (
                <div className="h-16 grid place-items-center text-[--color-muted]">—</div>
              )}
              {dealer.map((c) => (<CardView key={c.id} c={c} />))}
              {phase === "player" && dealerHole && (<CardView key={dealerHole.id} c={dealerHole} hidden />)}
            </div>

            {/* Player */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-[--color-muted]">You</div>
              <Score total={playerScore.total} soft={playerScore.soft} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {player.length === 0 && (
                <div className="h-16 grid place-items-center text-[--color-muted]">—</div>
              )}
              {player.map((c) => (<CardView key={c.id} c={c} />))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                className={`btn transition-colors ${canDeal ? "btn-brand hover:opacity-90" : "bg-white/10 text-zinc-500 cursor-not-allowed"}`}
                onClick={startRound}
                disabled={!canDeal || bet <= 0 || balance < 0}
              >
                Deal
              </button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={hit} disabled={!canAct}>Hit</button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={stand} disabled={!canAct}>Stand</button>
             <button className="btn bg-white/10 hover:bg-brand/60 disabled:opacity-50" onClick={doubleDown} disabled={!canDouble()}>Double</button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={newRound} disabled={phase !== "over"}>New Round</button>
            </div>

            {message && (
              <div className="mt-4 whitespace-pre-line rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
                {message}
                {settling && <span className="ml-2 text-xs text-white/60">Settling…</span>}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="card p-4 space-y-4 min-w-0">
            <div>
              <div className="text-sm font-medium">Bet Size</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.1, 0.25, 0.5, 1].map((b) => (
                  <button
                    key={b}
                    className={`btn text-sm ${bet === b ? "btn-brand hover:opacity-90" : "bg-white/10 hover:bg-brand/60"}`}
                    onClick={() => setBet(b)}
                    disabled={!canDeal}
                  >
                    {b} KTA
                  </button>
                ))}
              </div>
              {!canDeal && <div className="mt-2 text-xs text-[--color-muted]">Bet locked. Finish the round to change it.</div>}
            </div>

            <div className="text-xs text-[--color-muted]">
              <div>Rules: 3:2 blackjack, dealer stands on soft 17, no splits (yet).</div>
              <div className="mt-1">This is a demo: no web3 or real wagers.</div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
