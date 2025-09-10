"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useKeeta } from "../keeta/KeetaContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Game" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/account", label: "Account" },
];

const SNIPPET_LEN = 8;

/** Return first N chars of the address *after* the `keeta_` prefix */
function addrSnippet(addr: string | null | undefined, n = SNIPPET_LEN): string {
  if (!addr) return "";
  const prefix = "keeta_";
  const core = addr.startsWith(prefix) ? addr.slice(prefix.length) : addr;
  const sliced = core.slice(0, n);
  return `${sliced}${core.length > n ? "…" : ""}`;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, address } = useKeeta();

  const display = useMemo(() => addrSnippet(address), [address]);

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

        {connected && address ? (
          <button
            className="shrink-0 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            onClick={() => router.push("/account")}
            title={address}
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
