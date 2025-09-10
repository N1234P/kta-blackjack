import Link from "next/link";

const games = [
  { id: "blackjack", name: "Blackjack", status: "live",   edge: 0.5, desc: "Beat the dealer. 3:2 blackjack." },
  { id: "coinflip",  name: "Coin Flip", status: "paused", edge: 1.5, desc: "Fifty-fifty. Provably fair." },
  { id: "crash",     name: "Crash",     status: "paused", edge: 1.0, desc: "Cash out before it explodes." },
  { id: "towers",    name: "Towers",    status: "paused", edge: 1.2, desc: "Climb risk ladders; multiply." },
];

export default function GamesPage() {
  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold">Games</h1>
        <span className="text-xs text-white/60">More titles soon</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <GameTile key={g.id} game={g} />
        ))}
      </div>
    </section>
  );
}

function GameTile({ game }: { game: (typeof games)[number] }) {
  const isLive = game.status === "live";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 p-4 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{game.name}</h3>
        <span
          className={`text-[11px] px-2 py-1 rounded-full border ${
            isLive
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-white/10 text-white/70 border-white/20"
          }`}
        >
          {isLive ? "LIVE" : "COMING SOON"}
        </span>
      </div>

      <p className="text-sm text-white/70 mt-1">{game.desc}</p>
      <p className="text-xs text-white/50 mt-1">House edge: {game.edge}%</p>

      {isLive ? (
        <Link
          href={`/${game.id}`}
          className="mt-4 inline-flex items-center gap-1 rounded-xl btn btn-brand px-4 py-2 text-sm hover:opacity-90"
        >
          Play <span>→</span>
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
  );
}
