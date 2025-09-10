"use client";

import { useMemo } from "react";

type Leader = {
  wallet: string;
  pnl: number;
  games: number;
};

const leaders: Leader[] = Array.from({ length: 8 }, (_, i) => ({
  wallet: `Wallet_${(i + 1).toString().padStart(2, "0")}`,
  pnl: Math.round((Math.random() * 10000 - 2000) * 100) / 100,
  games: Math.floor(Math.random() * 300) + 10,
}));

export default function HomePage() {
  // top 8 but sorted by PnL desc to look leaderboard-y
  const sorted = useMemo(
    () => [...leaders].sort((a, b) => b.pnl - a.pnl),
    []
  );

  return (
    <div className="space-y-10 md:space-y-14 relative">
      {/* Subtle grid glow background */}
      <BackgroundGrid />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-emerald-600/20 via-emerald-400/5 to-transparent p-6 sm:p-10">
        <div className="flex flex-col items-center text-center gap-4">
          <Badge pill>ON-CHAIN ARCADE</Badge>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Keeta Network<span className="text-emerald-400">.</span>
            <br className="hidden sm:block" />
            <span className="text-white/90">Play to climb the board.</span>
          </h1>

          <p className="text-sm sm:text-base text-[--color-muted] max-w-2xl">
            Start with <b>Blackjack</b>. Fair odds, fast settles, testnet tokens.
            More games rolling out soon.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a className="btn btn-brand px-5 py-2.5 text-sm sm:text-base" href="/blackjack">
              🎮 Play Blackjack
            </a>
            <a
              className="btn bg-white/10 hover:bg-emerald-600/40 transition-colors px-5 py-2.5 text-sm sm:text-base"
              href="/leaderboard"
            >
              🏆 View Leaderboard
            </a>
          </div>

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full max-w-3xl">
            <Stat label="Active Game" value="Blackjack" />
            <Stat label="House Edge" value="~0.5%" />
            <Stat label="Hands Today" value="12,840" />
            <Stat label="Avg. Payout" value="99.5%" />
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GameTile
          title="Blackjack"
          status="Live"
          href="/blackjack"
          accent="emerald"
          desc="Beat the dealer. 3:2 blackjack."
        />
        <GameTile
          title="Coin Flip"
          status="Coming Soon"
          disabled
          desc="50/50, provably fair."
        />
        <GameTile
          title="Crash"
          status="Coming Soon"
          disabled
          desc="Cash out before it blows."
        />
        <GameTile
          title="Towers / Spin"
          status="Coming Soon"
          disabled
          desc="Risk ladder, big multipliers."
        />
      </section>

      {/* Leaderboard */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold">Top Players</h2>
          <a href="/leaderboard" className="text-sm text-emerald-400 hover:underline whitespace-nowrap">
            View full leaderboard →
          </a>
        </div>

        {/* Table on >= sm, cards on < sm */}
        <div className="hidden sm:block card overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left">
                <Th>#</Th>
                <Th>Wallet</Th>
                <Th className="text-right">PnL (KTA)</Th>
                <Th className="text-right">Hands</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((l, i) => (
                <tr key={l.wallet} className="odd:bg-white/[0.03]">
                  <Td>{i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar seed={l.wallet} />
                      <span className="font-mono">{l.wallet}</span>
                      {i === 0 && <Chip color="emerald">🔥 Hot</Chip>}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <PnL value={l.pnl} />
                  </Td>
                  <Td className="text-right">{l.games.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden grid grid-cols-1 gap-3">
          {sorted.map((l, i) => (
            <div key={l.wallet} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm w-6 text-center opacity-70">{i + 1}</div>
                <Avatar seed={l.wallet} />
                <div className="min-w-0">
                  <div className="font-mono truncate">{l.wallet}</div>
                  <div className="text-xs text-[--color-muted]">{l.games.toLocaleString()} hands</div>
                </div>
              </div>
              <div className="text-right">
                <PnL value={l.pnl} big />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- UI Bits ---------- */

function BackgroundGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_at_top,theme(colors.emerald.400/25),transparent_60%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-white" />
      </svg>
    </div>
  );
}

function Badge({ children, pill = false }: { children: React.ReactNode; pill?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
        pill ? "rounded-full" : "rounded-md"
      } bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left">
      <div className="text-[10px] tracking-wide uppercase text-white/60">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function GameTile({
  title,
  status,
  href,
  disabled,
  accent = "slate",
  desc,
}: {
  title: string;
  status: "Live" | "Coming Soon";
  href?: string;
  disabled?: boolean;
  accent?: "emerald" | "slate";
  desc?: string;
}) {
  const base =
    "relative overflow-hidden rounded-2xl border border-white/10 p-4 transition-colors";
  const liveBorder =
    accent === "emerald"
      ? "hover:border-emerald-500/50 hover:bg-emerald-500/10"
      : "hover:border-white/30 hover:bg-white/10";

  const content = (
    <div className={`${base} ${disabled ? "opacity-60" : liveBorder}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-[--color-muted]">{status}</div>
        {!disabled && status === "Live" && <Chip color="emerald">Play</Chip>}
      </div>
      <div className="text-xl font-semibold mt-1">{title}</div>
      {desc && <p className="text-sm text-white/60 mt-1">{desc}</p>}
      {!disabled && (
        <div className="absolute right-3 bottom-3 text-xs text-white/60">→</div>
      )}
    </div>
  );

  if (disabled || !href) return content;
  return (
    <a href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl">
      {content}
    </a>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-xs font-medium text-white/70 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}

function Chip({ children, color = "slate" }: { children: React.ReactNode; color?: "emerald" | "slate" }) {
  const cls =
    color === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : "bg-white/10 text-white/70 border-white/20";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

function PnL({ value, big = false }: { value: number; big?: boolean }) {
  const pos = value >= 0;
  const fmt = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span className={`${pos ? "text-emerald-300" : "text-rose-300"} ${big ? "text-base font-semibold" : ""}`}>
      {pos ? "▲ " : "▼ "}
      {fmt}
    </span>
  );
}

function Avatar({ seed }: { seed: string }) {
  // Simple, deterministic emoji avatar
  const emojis = ["🦈", "🦅", "🐍", "🐯", "🦊", "🐺", "🐉", "🦄", "🐬", "🦁"];
  const idx = Math.abs(hash(seed)) % emojis.length;
  return (
    <div className="h-8 w-8 grid place-items-center rounded-full bg-white/10 border border-white/15">
      <span className="text-base">{emojis[idx]}</span>
    </div>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
