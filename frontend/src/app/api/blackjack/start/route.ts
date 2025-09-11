// app/api/blackjack/start/route.ts
import { NextResponse } from "next/server";
import { makeServerSeed, shuffleWithSeeds } from "@/lib/server/fair";
import { newRound, saveRound } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { bet, clientSeed, address } = await req.json();
  if (!address || !address.startsWith("keeta_")) return NextResponse.json({ error: "Invalid address" }, { status: 400 });

  const betNum = Number(bet);
  if (!Number.isFinite(betNum) || betNum <= 0) return NextResponse.json({ error: "Invalid bet" }, { status: 400 });

  const clientSeedStr = String(clientSeed || "").slice(0, 64) || "client";
  const { serverSeed, shoeHash } = makeServerSeed();
  const deck = shuffleWithSeeds(serverSeed, clientSeedStr, 6);

  const round = await newRound({ address, bet: betNum, deck, serverSeed, shoeHash, clientSeed: clientSeedStr });
  await saveRound(round);

  const HOUSE_ADDRESS = process.env.HOUSE_ADDRESS!;
  if (!HOUSE_ADDRESS) return NextResponse.json({ error: "HOUSE_ADDRESS missing" }, { status: 500 });

  return NextResponse.json({
    roundId: round.id,
    shoeHash,
    escrowIntent: {
      to: HOUSE_ADDRESS,
      amount: betNum,
      memo: `bj:${round.id}:1x`,
    },
  });
}
