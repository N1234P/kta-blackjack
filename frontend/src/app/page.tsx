const leaders = Array.from({ length: 8 }, (_, i) => ({
  wallet: `Wallet_${(i + 1).toString().padStart(2, "0")}`,
  pnl: Math.round((Math.random() * 10000 - 2000) * 100) / 100,
  games: Math.floor(Math.random() * 300) + 10,
}));

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Keeta Network’s On-Chain Arcade
        </h1>
        <p className="text-[--color-muted] max-w-2xl mx-auto">
          Start with <strong>Blackjack</strong>. More games are coming soon.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a className="btn btn-brand" href="/blackjack">Play Blackjack</a>
          <a className="btn bg-white/10 hover:bg-brand/60 transition-colors" href="/leaderboard">View Leaderboard</a>
        </div>
      </section>

      {/* Mini grid (Blackjack live, others coming soon) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-[--color-muted]">Live Game</div>
          <div className="text-xl font-semibold mt-1">Blackjack</div>
        </div>
        <div className="card p-4 opacity-60">
          <div className="text-xs text-[--color-muted]">Coming Soon</div>
          <div className="text-xl font-semibold mt-1">Coin Flip</div>
        </div>
        <div className="card p-4 opacity-60">
          <div className="text-xs text-[--color-muted]">Coming Soon</div>
          <div className="text-xl font-semibold mt-1">Crash</div>
        </div>
        <div className="card p-4 opacity-60">
          <div className="text-xs text-[--color-muted]">Coming Soon</div>
          <div className="text-xl font-semibold mt-1">Towers / Spin</div>
        </div>
      </section>

      {/* Top Players (responsive table) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Top Players</h2>
          <a href="/leaderboard" className="text-sm text-brand hover:underline">
            View full leaderboard →
          </a>
        </div>

        <div className="table-wrap card">
          <table className="min-w-[540px] w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Wallet</th>
                <th className="px-4 py-2 text-right">PnL</th>
                <th className="px-4 py-2 text-right">Hands</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l, i) => (
                <tr key={l.wallet} className="odd:bg-white/[0.03]">
                  <td className="px-4 py-2">{i + 1}</td>
                  <td className="px-4 py-2 font-mono break-anywhere">{l.wallet}</td>
                  <td className={`px-4 py-2 text-right ${l.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {l.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right">{l.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
