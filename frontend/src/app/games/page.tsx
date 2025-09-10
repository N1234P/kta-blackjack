import Link from "next/link";

const games = [
  { id: "blackjack", name: "Blackjack", status: "live",   edge: 1.5 },
  { id: "coinflip",  name: "Coin Flip", status: "paused", edge: 1.5 },
  { id: "crash",     name: "Crash",     status: "paused", edge: 1.0 },
  { id: "towers",    name: "Towers",    status: "paused", edge: 1.2 },
];

export default function GamesPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Games</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <div key={g.id} className="min-w-0 rounded-2xl border border-white/10 p-4 bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{g.name}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-md ${
                  g.status === "live"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-yellow-500/20 text-yellow-300"
                }`}
              >
                {g.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">House edge: {g.edge}%</p>

            {g.status === "live" ? (
              <Link
                href={`/${g.id}`}
                className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Play
              </Link>
            ) : (
              <button
                disabled
                className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-zinc-500 cursor-not-allowed"
              >
                Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
