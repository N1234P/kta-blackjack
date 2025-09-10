"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useKeeta } from "../keeta/KeetaContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Game" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/account", label: "Account" },
];

const BASE_TOKEN_ID = "keeta_anyiff4v34alvumupagmdyosydeq24lc4def5mrpmmyhx3j6vj2uucckeqn52";

/** Balance wire shape coming back from /api/keeta */
type BalanceResult = {
  balance?: number;                 // human (preferred)
  balanceRaw?: string | number;     // raw base units (fallback)
  decimals?: number;                // usually 9
};

/** Convert raw base units → human number with <decimals> */
function humanFromRaw(raw: string | number | bigint, decimals = 9): number {
  let n: bigint;
  if (typeof raw === "bigint") n = raw;
  else if (typeof raw === "number") n = BigInt(Math.trunc(raw));
  else n = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;
  const fracStrFull = (frac + base).toString().slice(1).padStart(Number(decimals), "0");
  return Number(`${whole}.${fracStrFull}`);
}

/** Format a human number nicely, trimming trailing zeros */
function fmtHuman(x: number, dp = 4) {
  if (!Number.isFinite(x)) return String(x);
  const s = x.toFixed(dp);
  return s.replace(/\.?0+$/, "");
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, address, getBalance } = useKeeta();

  // store a HUMAN number or null; never undefined
  const [humanBalance, setHumanBalance] = useState<number | null>(null);
  const fetchingRef = useRef(false);

  const display = useMemo(() => {
    return humanBalance == null ? "— KTA" : `${fmtHuman(humanBalance, 4)} KTA`;
  }, [humanBalance]);

  useEffect(() => {
    if (!connected) {
      setHumanBalance(null);
      return;
    }
    let stopped = false;

    const refresh = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = (await getBalance({ token: BASE_TOKEN_ID })) as BalanceResult;

        // Prefer human 'balance'; otherwise derive from raw + decimals
        const human =
          typeof res?.balance === "number"
            ? res.balance
            : res?.balanceRaw != null
            ? humanFromRaw(res.balanceRaw, typeof res.decimals === "number" ? res.decimals : 9)
            : null;

        if (!stopped) setHumanBalance(human);
      } catch {
        if (!stopped) setHumanBalance(null);
      } finally {
        fetchingRef.current = false;
      }
    };

    // initial + periodic refresh
    refresh();
    const id = setInterval(refresh, 20000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [connected, pathname, getBalance]);

  return (
    <header className="sticky top-0 z-40 border-b border-[--color-border] backdrop-blur bg-black/40">
      <div className="container h-14 flex items-center justify-between gap-3">
        <Link href="/" className="shrink-0 font-semibold tracking-tight text-brand">
          Keeta Network
        </Link>

        <nav className="flex-1 overflow-x-auto sm:overflow-visible">
          <div className="flex gap-1 text-sm min-w-max sm:min-w-0">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  pathname === l.href
                    ? "bg-brand/20 text-white"
                    : "text-[--color-muted] hover:text-white hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        {connected ? (
          <button
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            onClick={() => router.push("/account")}
            title={address ?? ""}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">{display}</span>
          </button>
        ) : (
          <Link href="/account" className="btn btn-brand text-sm shrink-0 px-3 sm:px-4">
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </Link>
        )}
      </div>
    </header>
  );
}
