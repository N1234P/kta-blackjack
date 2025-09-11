// app/api/blackjack/escrow/route.ts
import { NextResponse } from "next/server";
import { loadRound, saveRound } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSteps(n: number): 0 | 1 | 2 { const v = Math.trunc(n); if (v <= 0) return 0; if (v === 1) return 1; return 2; }

// ---- TODO: implement real on-chain verification here ----
async function verifyEscrowOnChain(args: {
  txId?: string;
  from: string;         // player address
  to: string;           // house address
  amount: number;       // expected stake
  roundId: string;
  step: 1 | 2;          // 1x or 2x (double)
  memo?: string;        // expected memo bj:<roundId>:1x|2x
}): Promise<{ ok: true; txId?: string } | { ok: false; reason: string }> {
  // Example shape (pseudo-code):
  // const tx = args.txId ? await chain.getTx(args.txId) : await chain.findLatestPayment({ from: args.from, to: args.to, amount: args.amount, memo: args.memo });
  // if (!tx || tx.to !== args.to || tx.from !== args.from) return { ok: false, reason: "mismatch" };
  // if (tx.amount !== args.amount) return { ok: false, reason: "amount" };
  // if (args.memo && tx.memo !== args.memo) return { ok: false, reason: "memo" };
  // if (!tx.confirmed) return { ok: false, reason: "pending" };
  // return { ok: true, txId: tx.id };
  return { ok: true }; // TEMP: accept in demo
}

export async function POST(req: Request) {
  const { roundId, step = 1, txId } = (await req.json()) as { roundId: string; step?: 1 | 2; txId?: string };
  if (!roundId) return NextResponse.json({ error: "Missing roundId" }, { status: 400 });

  const round = await loadRound(roundId);
  const HOUSE_ADDRESS = process.env.HOUSE_ADDRESS!;
  if (!HOUSE_ADDRESS) return NextResponse.json({ error: "HOUSE_ADDRESS missing" }, { status: 500 });

  // Build expected memo
  const memo = `bj:${round.id}:${step === 2 ? "2x" : "1x"}`;

  // Verify escrow (replace stub with real chain check)
  const verified = await verifyEscrowOnChain({
    txId,
    from: round.address,
    to: HOUSE_ADDRESS,
    amount: round.bet,
    roundId: round.id,
    step,
    memo,
  });
  if (!verified.ok) return NextResponse.json({ error: `Escrow not verified: ${"reason" in verified ? verified.reason : "unknown"}` }, { status: 400 });

  // Idempotency: do not double-count
  if (step === 1 && round.escrowVerified >= 1) return NextResponse.json({ ok: true, escrowVerified: round.escrowVerified });
  if (step === 2 && round.escrowVerified >= 2) return NextResponse.json({ ok: true, escrowVerified: round.escrowVerified });

  // Mark verified
  const next = toSteps(round.escrowVerified + 1);
  if (next === 1) round.escrowTx1 = verified.txId ?? txId ?? "unknown";
  if (next === 2) round.escrowTx2 = verified.txId ?? txId ?? "unknown";
  round.escrowVerified = next;
  round.escrowCount = next; // mirror for UI
  await saveRound(round);

  return NextResponse.json({ ok: true, escrowVerified: round.escrowVerified });
}
