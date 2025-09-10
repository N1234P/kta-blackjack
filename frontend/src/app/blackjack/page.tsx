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
  const [isFunding, setIsFunding] = useState<false | "BET_1X" | "DOUBLE_1X">(false);

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

  // REQUIRE: escrow 1x BEFORE any cards are dealt.
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

    // escrow the additional 1x for double BEFORE drawing
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

  const canDeal = (phase === "idle" || phase === "over") && !isFunding;
  const canAct = phase === "player" && !isFunding;

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
              {doubled && <span className="ml-2 text-xs text-brand-200">Doubled</span>}
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
                disabled={!canDeal || bet <= 0 || balance < bet}
              >
                {isFunding === "BET_1X" ? "Funding…" : "Deal"}
              </button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={hit} disabled={!canAct}>Hit</button>
              <button className="btn bg-white/10 hover:bg-brand/60" onClick={stand} disabled={!canAct}>Stand</button>
              <button
                className="btn bg-white/10 hover:bg-brand/60 disabled:opacity-50"
                onClick={doubleDown}
                disabled={!canDouble()}
              >
                {isFunding === "DOUBLE_1X" ? "Funding…" : "Double"}
              </button>
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
              {!canDeal && <div className="mt-2 text-xs text-[--color-muted]">Bet locked. Finish or cancel the round to change it.</div>}
            </div>

            <div className="text-xs text-[--color-muted]">
              <div>Rules: 3:2 blackjack, dealer stands on soft 17, no splits (yet).</div>
              <div className="mt-1">Escrow required before deal and before Double.</div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
