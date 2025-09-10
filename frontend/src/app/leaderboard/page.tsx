"use client";

import { useMemo, useState } from "react";

type Leader = { wallet: string; pnl: number; games: number };

const initial: Leader[] = Array.from({ length: 25 }, (_, i) => ({
  wallet: `Wallet_${(i + 1).toString().padStart(2, "0")}`,
  pnl: Math.round((Math.random() * 10000 - 2000) * 100) / 100,
  games: Math.floor(Math.random() * 300) + 10,
}));

export default function LeaderboardPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"pnl" | "games">("pnl");

  const data = useMemo(() => {
    const filtered = initial.filter((l) =>
      l.wallet.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.sort((a, b) =>
      sort === "pnl" ? b.pnl - a.pnl : b.games - a.games
    );
  }, [query, sort]);

  return (
    <section className="space-y-5 md:space-y-6 relative">
      <HeaderBar />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <input
            placeholder="Search wallet (e.g. Wallet_03)"
            className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <SortTab active={sort === "pnl"} onClick={() => setSort("pnl")}>
            Sort by PnL
          </SortTab>
          <SortTab active={sort === "games"} onClick={() => setSort("games")}>
            Sort by Hands
          </SortTab>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block card overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-left">
              <Th>#</Th>
              <Th>Wallet</Th>
              <Th className="text-right">PnL (KTA)</Th>
              <Th className="text-right">Hands</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((l, i) => (
              <tr key={l.wallet} className="odd:bg-white/[0.03]">
                <Td>{i + 1}</Td>
                <Td>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar seed={l.wallet} />
                    <span className="font-mono truncate">{l.wallet}</span>
                   
                     {/*i === 0 && <Chip color="emerald">Top 1%</Chip>*/}
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
        {data.map((l, i) => (
          <div key={l.wallet} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-sm w-6 text-center opacity-70">{i + 1}</div>
              <Avatar seed={l.wallet} />
              <div className="min-w-0">
                <div className="font-mono truncate">{l.wallet}</div>
                <div className="text-xs text-[--color-muted]">
                  {l.games.toLocaleString()} hands
                </div>
              </div>
            </div>
            <div className="text-right">
              <PnL value={l.pnl} big />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[--color-muted] text-sm">
        More game leaderboards will appear here as they go live.
      </p>
    </section>
  );
}

/* ---------- UI bits (local to this file) ---------- */

function HeaderBar() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl sm:text-3xl font-semibold">Blackjack Leaderboard</h1>
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-xs font-medium text-white/70 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}

function SortTab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
        active
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
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
  const emojis = ["🦈", "🦅", "🐍", "🐯", "🦊", "🐺", "🐉", "🦄", "🐬", "🦁"];
  const idx = Math.abs(hash(seed)) % emojis.length;
  return (
    <div className="h-8 w-8 grid place-items-center rounded-full bg-white/10 border border-white/15">
      <span className="text-base">{emojis[idx]}</span>
    </div>
  );
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
