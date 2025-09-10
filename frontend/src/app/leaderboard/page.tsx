const leaders = Array.from({ length: 25 }, (_, i) => ({
  wallet: `Wallet_${(i + 1).toString().padStart(2, "0")}`,
  pnl: Math.round((Math.random() * 10000 - 2000) * 100) / 100,
  games: Math.floor(Math.random() * 300) + 10,
}));

export default function LeaderboardPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Blackjack Leaderboard</h1>

      <div className="table-wrap card">
        <table className="min-w-[560px] w-full text-sm">
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

      <p className="text-[--color-muted] text-sm">Other game leaderboards are coming soon.</p>
    </section>
  );
}
