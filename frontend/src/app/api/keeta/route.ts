import { NextResponse } from "next/server";
import { createRequire } from "module";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body =
  | { op: "address"; seed: string }
  | { op: "balance"; seed: string; address: string; token: string }
  | { op: "send"; seed: string; destination: string; amount: number };

export async function POST(req: Request) {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("@keetanetwork/keetanet-client");
    const { UserClient, lib: { Account } } = pkg;

    const body = (await req.json()) as Body;

    // derive account from mnemonic seed phrase
    const seed = body.seed.trim();
    const account = Account.fromSeed(await Account.seedFromPassphrase(seed), 0);
    const client = UserClient.fromNetwork("test", account);

    if (body.op === "address") {
      return NextResponse.json({ address: account.publicKeyString.toString() });
    }

    if (body.op === "balance") {
      const { address, token } = body;
      const raw = await client.client.getBalance(address, token);

      const rawBig = typeof raw === "bigint" ? raw : BigInt(raw);
      const human = Number(rawBig) / 1e9;

      return NextResponse.json({
        balanceRaw: rawBig.toString(), // safe for JSON
        balance: human,                // human readable (div 1e9)
        decimals: 9,
      });
}



    if (body.op === "send") {
      const { destination, amount } = body;
      if (!destination?.startsWith("keeta_")) {
        return NextResponse.json({ error: "Destination must be a keeta_ address" }, { status: 400 });
      }
      const amtNum = Number(amount);
      if (!Number.isFinite(amtNum) || amtNum <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      // new SDK flow
      const toAccount = Account.fromPublicKeyString(destination);

      // detect decimals if exposed; default to 9 for KTA
      const decimals: number =
        (client as any)?.baseToken?.decimals != null ? Number((client as any).baseToken.decimals) : 9;

      const baseUnits = toBaseUnits(amtNum, decimals); // e.g. 2 -> 2000000000n when decimals=9

      const builder = client.initBuilder();
      builder.send(toAccount, baseUnits, client.baseToken);

      // optional but useful for debugging
      const computed = await client.computeBuilderBlocks(builder);

      const tx = await client.publishBuilder(builder);

      

// ✅ minimal response
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err: any) {
    console.error("[/api/keeta] error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

function toBaseUnits(amountHuman: number, decimals = 9): bigint {
  // Avoid FP drift by string math
  const s = String(amountHuman);
  const [whole, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals); // pad/truncate
  return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(frac || "0");
}

// utils/serializeBigInt.ts
export function serializeBigInt<T>(val: T): T {
  if (typeof val === "bigint") return (val.toString() as unknown) as T;
  if (Array.isArray(val)) return (val.map(serializeBigInt) as unknown) as T;
  if (val && typeof val === "object") {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, serializeBigInt(v)])
    ) as unknown as T;
  }
  return val;
}




