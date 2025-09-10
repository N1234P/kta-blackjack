export type Leader = { wallet: string; pnl: number; games: number };


export default function LeaderboardTable({ leaders }: { leaders: Leader[] }) {
return (
<div className="overflow-hidden card">
<table className="w-full text-sm">
<thead className="bg-white/5">
<tr>
<th className="px-4 py-2 text-left">#</th>
<th className="px-4 py-2 text-left">Wallet</th>
<th className="px-4 py-2 text-right">PnL</th>
<th className="px-4 py-2 text-right">Games</th>
</tr>
</thead>
<tbody>
{leaders.map((l, i) => (
<tr key={l.wallet} className="odd:bg-white/[0.03]">
<td className="px-4 py-2">{i + 1}</td>
<td className="px-4 py-2 font-mono">{l.wallet}</td>
<td className={`px-4 py-2 text-right ${l.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
{l.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</td>
<td className="px-4 py-2 text-right">{l.games}</td>
</tr>
))}
</tbody>
</table>
</div>
);
}