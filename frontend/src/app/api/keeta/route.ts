import { NextResponse } from "next/server";
import { createRequire } from "module";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body =
  | { op: "address"; seed: string }
  | { op: "balance"; seed: string; address: string; token: string }
  | { op: "send"; seed: string; destination: string; amount: number }
  | { op: "payout"; to: string; amount: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const require = createRequire(import.meta.url);
    const pkg = require("@keetanetwork/keetanet-client");
    const {
      UserClient,
      lib: { Account },
    } = pkg;

    // ---------- server-signed payout (house -> player) ----------
    if (body.op === "payout") {
     
      const HOUSE_SEED = process.env.HOUSE_SEED;
     
      if (!HOUSE_SEED) {
        return NextResponse.json({ error: "HOUSE_SEED not configured" }, { status: 500 });
      }

      const { to, amount } = body;
      if (!to?.startsWith("keeta_")) {
        return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
      }

      console.log("HERENEXT??");
      const amtNum = Number(amount);
      if (!Number.isFinite(amtNum) || amtNum <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      console.log(HOUSE_SEED);
      // House signer
      const house = Account.fromSeed(await Account.seedFromPassphrase(HOUSE_SEED), 0);
      const client = UserClient.fromNetwork("test", house);
      console.log(house);
      console.log("AFTER HOUSE CREATION")

      const toAccount = Account.fromPublicKeyString(to);
      const decimals: number =
        (client as any)?.baseToken?.decimals != null ? Number((client as any).baseToken.decimals) : 9;
      const baseUnits = toBaseUnits(amtNum, decimals);

      const builder = client.initBuilder();
      builder.send(toAccount, baseUnits, client.baseToken);
      // optional: await client.computeBuilderBlocks(builder);
      await client.publishBuilder(builder);

      return NextResponse.json({ success: true });
    }

    // For the remaining ops we do need the user's seed:
    if (body.op === "address") {
      const seed = body.seed.trim();
      const account = Account.fromSeed(await Account.seedFromPassphrase(seed), 0);
      return NextResponse.json({ address: account.publicKeyString.toString() });
    }

    if (body.op === "balance") {
      const { seed, address, token } = body;
      const account = Account.fromSeed(await Account.seedFromPassphrase(seed.trim()), 0);
      const client = UserClient.fromNetwork("test", account);

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
      const { seed, destination, amount } = body;

      if (!destination?.startsWith("keeta_")) {
        return NextResponse.json({ error: "Destination must be a keeta_ address" }, { status: 400 });
      }
      const amtNum = Number(amount);
      if (!Number.isFinite(amtNum) || amtNum <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      const account = Account.fromSeed(await Account.seedFromPassphrase(seed.trim()), 0);
      const client = UserClient.fromNetwork("test", account);

      const toAccount = Account.fromPublicKeyString(destination);
      const decimals: number =
        (client as any)?.baseToken?.decimals != null ? Number((client as any).baseToken.decimals) : 9;
      const baseUnits = toBaseUnits(amtNum, decimals); // e.g. 2 -> 2000000000n when decimals=9

      const builder = client.initBuilder();
      builder.send(toAccount, baseUnits, client.baseToken);

      // optional: useful for debugging:
      // const computed = await client.computeBuilderBlocks(builder);

      await client.publishBuilder(builder);

      // minimal JSON (no BigInt)
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err: any) {
    console.error("[/api/keeta] error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}

/** Convert human amount (e.g. 2.5) into base units BigInt (decimals default 9) */
function toBaseUnits(amountHuman: number, decimals = 9): bigint {
  const s = String(amountHuman);
  const [whole, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals); // pad/truncate
  return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt(frac || "0");
}
