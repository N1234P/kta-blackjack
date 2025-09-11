// app/api/blackjack/state/route.ts
import { NextResponse } from "next/server";
import { loadRound, publicState } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roundId = searchParams.get("roundId");
  if (!roundId) return NextResponse.json({ error: "Missing roundId" }, { status: 400 });
  const r = await loadRound(roundId);
  return NextResponse.json({ state: publicState(r) });
}
