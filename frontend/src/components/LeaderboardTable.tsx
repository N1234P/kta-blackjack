export type Leader = { wallet: string; pnl: number; games: number };

export default function LeaderboardTable({ leaders }: { leaders: Leader[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[680px] w-full text-sm">
          <thead className="bg-white/5 sticky top-0">
            <tr>
              <Th>#</Th>
              <Th>Wallet</Th>
              <Th className="text-right">PnL (KTA)</Th>
              <Th className="text-right">Games</Th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((l, i) => (
              <tr key={l.wallet} className="odd:bg-white/[0.03]">
                <Td>{i + 1}</Td>
                <Td>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar seed={l.wallet} />
                    <span className="font-mono truncate">{l.wallet}</span>
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
    </div>
  );
}

/* small helpers locally scoped */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-xs font-medium text-white/70 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}
function PnL({ value }: { value: number }) {
  const pos = value >= 0;
  const fmt = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <span className={pos ? "text-emerald-300" : "text-rose-300"}>{pos ? "▲ " : "▼ "}{fmt}</span>;
}
function Avatar({ seed }: { seed: string }) {
  const emojis = ["🦈","🦅","🐍","🐯","🦊","🐺","🐉","🦄","🐬","🦁"];
  const idx = Math.abs(hash(seed)) % emojis.length;
  return (
    <div className="h-8 w-8 grid place-items-center rounded-full bg-white/10 border border-white/15">
      <span className="text-base">{emojis[idx]}</span>
    </div>
  );
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
