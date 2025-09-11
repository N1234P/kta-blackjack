"use client";
import Link from "next/link";
import Image from "next/image";
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
    <header className="sticky top-0 z-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-20 h-20 bg-gradient-to-b from-emerald-500/15 to-transparent"
      />
      <div className="border-b border-white/10 bg-zinc-950/60 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/40">
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Brand */}
            <Link href="/" className="group flex items-center gap-2 shrink-0" aria-label="Keeta Network home">
             <Image
  src="/keeta-logo.png"    // your cleaned file
  alt="Keeta logo"
  width={45}
  height={30}
  className="h-8 w-8 rounded-full ring-1 ring-white/10 bg-black"
/>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 via-emerald-100 to-teal-200">
                Keeta&nbsp;<span className="font-semibold text-white/80 group-hover:text-white transition-colors">Network</span>
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex-1 overflow-x-auto sm:overflow-visible">
              <ul className="flex items-center gap-1 sm:gap-1.5 text-sm min-w-max sm:min-w-0">
                {links.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <li key={l.href} className="relative">
                      <Link
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={`group relative block rounded-xl px-3.5 py-2 transition-colors ${
                          active
                            ? "bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                            : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="relative z-10">{l.label}</span>
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute left-3 right-3 -bottom-[2px] h-[2px] rounded-full ${
                            active
                              ? "bg-gradient-to-r from-emerald-400/0 via-emerald-400/80 to-emerald-400/0"
                              : "bg-transparent group-hover:bg-white/20"
                          }`}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Right side */}
            {connected && address ? (
              <button
                className="shrink-0 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm text-emerald-200 hover:bg-emerald-400/15 hover:border-emerald-400/40 transition-colors shadow-[0_8px_24px_rgba(16,185,129,0.2)]"
                onClick={() => router.push("/account")}
                title={address}
              >
                <span className="relative inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400/30 blur-[2px] animate-pulse" />
                </span>
                <span className="font-mono tracking-tight">{display}</span>
              </button>
            ) : (
              <Link
                href="/account"
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-emerald-500 text-emerald-950 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-[0_10px_24px_rgba(16,185,129,0.35)] ring-1 ring-emerald-300/50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-90">
                  <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  );
}
