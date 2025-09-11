// lib/server/payout.ts
import "server-only";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("@keetanetwork/keetanet-client");
const {
  UserClient,
  lib: { Account },
} = pkg;

export async function payHouse(to: string, amountKta: number) {
  const HOUSE_SEED = process.env.HOUSE_SEED;
  if (!HOUSE_SEED) throw new Error("HOUSE_SEED not configured");
  if (!to?.startsWith("keeta_")) throw new Error("Invalid destination");
  const amtNum = Number(amountKta);
  if (!Number.isFinite(amtNum) || amtNum <= 0) throw new Error("Invalid amount");

  const house = Account.fromSeed(await Account.seedFromPassphrase(HOUSE_SEED), 0);
  const client = UserClient.fromNetwork("test", house);
  const toAccount = Account.fromPublicKeyString(to);
  const decimals: number =
    (client as any)?.baseToken?.decimals != null ? Number((client as any).baseToken.decimals) : 9;
  const baseUnits = toBaseUnits(amtNum, decimals);

  const builder = client.initBuilder();
  builder.send(toAccount, baseUnits, client.baseToken);
  await client.publishBuilder(builder);
  return { ok: true };
}

function toBaseUnits(amountHuman: number, decimals = 9): bigint {
  const s = String(amountHuman);
  const [whole, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt(frac || "0");
}
