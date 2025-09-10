// utils/settlement.ts (client)
export async function userPaysDealer({
  userSeed,
  dealerAddress,
  amountKta,
}: { userSeed: string; dealerAddress: string; amountKta: number }) {
  const r = await fetch("/api/keeta", {
    method: "POST",
    body: JSON.stringify({ op: "send", seed: userSeed, destination: dealerAddress, amount: amountKta }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "user send failed");
  return j; // { success: true }
}

export async function dealerPaysUser({
  userAddress,
  amountKta,
}: { userAddress: string; amountKta: number }) {
  const r = await fetch("/api/payout", {
    method: "POST",
    body: JSON.stringify({ to: userAddress, amountKta }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "payout failed");
  return j; // { ok: true, txHash }
}
