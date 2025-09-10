"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useKeeta } from "../keeta/KeetaContext"; // adjust path if needed

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Game" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/account", label: "Account" },
];

const BASE_TOKEN_ID =
  "keeta_anyiff4v34alvumupagmdyosydeq24lc4def5mrpmmyhx3j6vj2uucckeqn52";

// 👇 Set this to true if your API returns RAW base units (e.g., 30000000000 for 30 KTA)
// Set to false if your API already returns HUMAN units (e.g., 30 for 30 KTA)
const BALANCE_IS_RAW = false;

// Format human number (string/number) with up to dp decimals
function fmtHuman(x: string | number | bigint, dp = 4) {
  if (typeof x === "bigint") return x.toString();
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return String(x);
  const s = n.toFixed(dp);
  return s.replace(/\.?0+$/, ""); // trim trailing zeros
}

// Convert RAW base-units (BigInt/string/number) with 9 decimals → human string
function fmtFromRaw(raw: string | number | bigint, decimals = 9, dp = 4) {
  let n: bigint;
  if (typeof raw === "bigint") n = raw;
  else if (typeof raw === "number") n = BigInt(Math.trunc(raw));
  else n = BigInt(raw);

  const base = BigInt(10) ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;



  const fracStrFull = (frac + base).toString().slice(1).padStart(Number(decimals), "0");
  const fracShown = fracStrFull.slice(0, dp).replace(/0+$/, "");
  return fracShown ? `${whole.toString()}.${fracShown}` : whole.toString();
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, address, getBalance } = useKeeta();

  const [rawBalance, setRawBalance] = useState<string | number | bigint | null>(null);
  const fetchingRef = useRef(false);

  const display = useMemo(() => {
    if (rawBalance == null) return "— KTA";
    return BALANCE_IS_RAW ? `${fmtFromRaw(rawBalance)} KTA` : `${fmtHuman(rawBalance)} KTA`;
  }, [rawBalance]);

  useEffect(() => {
    if (!connected) {
      setRawBalance(null);
      return;
    }

    let stopped = false;

    const refresh = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await getBalance({ token: BASE_TOKEN_ID });
        if (!stopped) setRawBalance(res.balance);
      } catch {
        // ignore for header
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
            className="btn bg-white/10 hover:bg-brand/60 text-sm shrink-0 px-3 sm:px-4 font-mono"
            onClick={() => router.push("/account")}
            title={address ?? ""}
          >
            {display}
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
