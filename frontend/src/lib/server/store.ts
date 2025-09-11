// lib/server/store.ts
import "server-only";
import { Card } from "./fair";
import crypto from "crypto";

export type Phase = "awaiting_escrow" | "player" | "dealer" | "over";
export type Outcome = "player" | "dealer" | "push" | null;

export type Round = {
  id: string;
  address: string;
  bet: number;
  doubled: boolean;
  phase: Phase;

  deck: Card[];
  cursor: number;

  player: Card[];
  dealerUp: Card[];
  dealerHole: Card | null;

  serverSeed: string;
  shoeHash: string;
  clientSeed: string;

  // Escrow
  escrowCount: 0 | 1 | 2;      // legacy/display
  escrowVerified: 0 | 1 | 2;   // authoritative gate
  escrowTx1?: string;
  escrowTx2?: string;

  outcome: Outcome;
  payout: number;
  paid: boolean;

  createdAt: number;
  updatedAt: number;
};

const rounds = new Map<string, Round>();

export function newId() { return crypto.randomUUID(); }

export async function saveRound(round: Round) { round.updatedAt = Date.now(); rounds.set(round.id, round); }
export async function loadRound(id: string): Promise<Round> {
  const r = rounds.get(id);
  if (!r) throw new Error("Round not found");
  return r;
}

export async function newRound(init: Omit<Round,
  "id" | "createdAt" | "updatedAt" | "paid" | "payout" | "outcome" |
  "phase" | "doubled" | "escrowCount" | "escrowVerified" |
  "player" | "dealerUp" | "dealerHole" | "cursor">) {
  const id = newId();
  const r: Round = {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paid: false,
    payout: 0,
    outcome: null,
    phase: "awaiting_escrow",
    doubled: false,
    escrowCount: 0,
    escrowVerified: 0,
    player: [],
    dealerUp: [],
    dealerHole: null,
    cursor: 0,
    ...init,
  };
  rounds.set(id, r);
  return r;
}

export function publicState(r: Round) {
  return {
    id: r.id,
    address: r.address,
    bet: r.bet,
    doubled: r.doubled,
    phase: r.phase,
    shoeHash: r.shoeHash,
    player: r.player,
    dealer: r.phase === "player" ? r.dealerUp : (r.dealerHole ? [...r.dealerUp, r.dealerHole] : r.dealerUp),
    escrowCount: r.escrowCount,
    outcome: r.outcome,
    payout: r.payout,
    updatedAt: r.updatedAt,
  };
}
