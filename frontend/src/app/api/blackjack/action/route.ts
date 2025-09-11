// app/api/blackjack/action/route.ts
import { NextResponse } from "next/server";
import { handValue, isBlackjack, Card } from "@/lib/server/fair";
import { loadRound, saveRound, publicState, Round } from "@/lib/server/store";
import { payHouse } from "@/lib/server/payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "deal" | "hit" | "stand" | "double";

export async function POST(req: Request) {
  const { roundId, action } = (await req.json()) as { roundId: string; action: Action };
  if (!roundId) return NextResponse.json({ error: "Missing roundId" }, { status: 400 });

  const r = await loadRound(roundId);

  try {
    switch (action) {
      case "deal": await handleDeal(r); break;
      case "hit": await handleHit(r); break;
      case "stand": await handleStand(r); break;
      case "double": await handleDouble(r); break;
      default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    await saveRound(r);

    if (r.phase === "over" && !r.paid && r.payout > 0) {
      const needed = r.doubled ? 2 : 1;
      if (r.escrowVerified < needed) throw new Error("Payout blocked: escrow not verified");
      await payHouse(r.address, r.payout);
      r.paid = true;
      await saveRound(r);
    }

    return NextResponse.json({ state: publicState(r), result: r.phase === "over" ? { outcome: r.outcome, payout: r.payout } : null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Action failed" }, { status: 400 });
  }
}

function need(n: number, r: Round): Card[] {
  const take = r.deck.slice(r.cursor, r.cursor + n);
  if (take.length < n) throw new Error("Shoe exhausted");
  r.cursor += n;
  return take;
}

async function handleDeal(r: Round) {
  if (r.phase !== "awaiting_escrow") throw new Error("Round already started");
  if (r.escrowVerified < 1) throw new Error("Escrow 1x is required before dealing");

  r.player = []; r.dealerUp = []; r.dealerHole = null; r.doubled = false; r.outcome = null; r.payout = 0;

  const [p1] = need(1, r);
  const [dUp] = need(1, r);
  const [p2] = need(1, r);
  const [dHole] = need(1, r);

  r.player = [p1, p2];
  r.dealerUp = [dUp];
  r.dealerHole = dHole;
  r.phase = "player";

  const pBJ = isBlackjack(r.player);
  const dBJ = isBlackjack([dUp, dHole]);

  if (pBJ || dBJ) {
    r.phase = "over";
    if (pBJ && dBJ) { r.outcome = "push"; r.payout = r.bet * 1; }
    else if (pBJ) { r.outcome = "player"; r.payout = r.bet * 2.5; }
    else { r.outcome = "dealer"; r.payout = 0; }
  }
}

async function handleHit(r: Round) {
  if (r.phase !== "player") throw new Error("Not player's turn");
  r.player.push(need(1, r)[0]);
  if (handValue(r.player).total > 21) { r.phase = "over"; r.outcome = "dealer"; r.payout = 0; }
}

async function handleStand(r: Round) {
  if (r.phase !== "player") throw new Error("Not player's turn");
  r.phase = "dealer";
  dealerPlayToEnd(r);
}

async function handleDouble(r: Round) {
  if (r.phase !== "player") throw new Error("Not player's turn");
  if (r.player.length !== 2) throw new Error("Double allowed only on first two cards");
  if (r.doubled) throw new Error("Already doubled");
  if (r.escrowVerified < 2) throw new Error("Double requires second 1x escrow");

  r.doubled = true;
  r.player.push(need(1, r)[0]);

  if (handValue(r.player).total > 21) { r.phase = "over"; r.outcome = "dealer"; r.payout = 0; }
  else { r.phase = "dealer"; dealerPlayToEnd(r); }
}

function dealerPlayToEnd(r: Round) {
  if (r.dealerHole) { r.dealerUp.push(r.dealerHole); r.dealerHole = null; }
  const standOnSoft17 = true;

  while (true) {
    const { total, soft } = handValue(r.dealerUp);
    if (total > 21) break;
    if (total > 17) break;
    if (total === 17 && standOnSoft17) break;
    r.dealerUp.push(need(1, r)[0]);
  }

  const p = handValue(r.player).total;
  const dv = handValue(r.dealerUp).total;

  r.phase = "over";
  if (dv > 21 || p > dv) {
    r.outcome = "player";
    r.payout = r.doubled ? r.bet * 4 : r.bet * 2;
  } else if (p < dv) {
    r.outcome = "dealer"; r.payout = 0;
  } else {
    r.outcome = "push";
    r.payout = r.doubled ? r.bet * 2 : r.bet * 1;
  }
}
