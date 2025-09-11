// app/api/keeta/route.ts
import { NextResponse } from "next/server";
import { createRequire } from "module";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body =
  | { op: "address"; seed: string }
  | { op: "balance"; seed: string; address: string; token: string }
  | { op: "send"; seed: string; destination: string; amount: number; memo?: string }
  | { op: "create" }; // optional, only if you use createWallet()

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const require = createRequire(import.meta.url);
    const pkg = require("@keetanetwork/keetanet-client");
    const { UserClient, lib: { Account } } = pkg;

    // create (optional)
    if (body.op === "create") {
      // demo seed: 32 random bytes hex; replace with proper mnemonic if SDK supports it
      const seed = crypto.randomBytes(32).toString("hex");
      const acct = Account.fromSeed(await Account.seedFromPassphrase(seed), 0);
      return NextResponse.json({ seed, address: acct.publicKeyString.toString() });
    }

    if (body.op === "address") {
      const account = Account.fromSeed(await Account.seedFromPassphrase(body.seed.trim()), 0);
      return NextResponse.json({ address: account.publicKeyString.toString() });
    }

    if (body.op === "balance") {
      const account = Account.fromSeed(await Account.seedFromPassphrase(body.seed.trim()), 0);
      const client = UserClient.fromNetwork("test", account);
      const raw = await client.client.getBalance(body.address, body.token);
      const rawBig = typeof raw === "bigint" ? raw : BigInt(raw);
      const human = Number(rawBig) / 1e9;
      return NextResponse.json({ balanceRaw: rawBig.toString(), balance: human, decimals: 9 });
    }

    if (body.op === "send") {
      const { seed, destination, amount, memo } = body;
      const amtNum = Number(amount);
      if (!destination?.startsWith("keeta_")) return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
      if (!Number.isFinite(amtNum) || amtNum <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

      const account = Account.fromSeed(await Account.seedFromPassphrase(seed.trim()), 0);
      const client = UserClient.fromNetwork("test", account);
      const toAccount = Account.fromPublicKeyString(destination);
      const decimals: number =
        (client as any)?.baseToken?.decimals != null ? Number((client as any).baseToken.decimals) : 9;

      const baseUnits = toBaseUnits(amtNum, decimals);
      const builder = client.initBuilder();

      // If the SDK supports a memo/comment, attach it here:
      // builder.setMemo?.(memo);

      builder.send(toAccount, baseUnits, client.baseToken);
      await client.publishBuilder(builder);

      // If SDK gives a tx/hash, return it as txId:
      return NextResponse.json({ success: true /*, txId */ });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err: any) {
    console.error("[/api/keeta] error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

function toBaseUnits(amountHuman: number, decimals = 9): bigint {
  const s = String(amountHuman);
  const [whole, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt(frac || "0");
}
