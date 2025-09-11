// lib/server/fair.ts
import "server-only";
import crypto from "crypto";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Card = { rank: Rank; suit: Suit; id: string };

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function buildShoe(numDecks = 6): Card[] {
  const cards: Card[] = [];
  let uid = 0;
  for (let d = 0; d < numDecks; d++) {
    for (const s of SUITS) for (const r of RANKS) cards.push({ rank: r, suit: s, id: `${d}-${r}${s}-${uid++}` });
  }
  return cards;
}

export function makeServerSeed() {
  const serverSeed = crypto.randomBytes(32).toString("hex");
  const shoeHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  return { serverSeed, shoeHash };
}

export function shuffleWithSeeds(serverSeed: string, clientSeed: string, numDecks = 6): Card[] {
  const deck = buildShoe(numDecks).slice();
  let i = deck.length - 1;
  let counter = 0;
  while (i > 0) {
    const h = crypto.createHmac("sha256", serverSeed).update(`${clientSeed}:${counter++}`).digest();
    const u32 = h.readUInt32BE(0);
    const j = u32 % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
    i--;
  }
  return deck;
}

export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J") return 10;
  return parseInt(rank, 10);
}
export function handValue(hand: Card[]) {
  let total = 0, aces = 0;
  for (const c of hand) {
    if (c.rank === "A") { aces++; total += 11; } else total += cardValue(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  const soft = hand.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  return { total, soft };
}
export function isBlackjack(hand: Card[]) { return hand.length === 2 && handValue(hand).total === 21; }
