import Link from "next/link";

export type Game = { id: string; name: string; status: "live" | "paused"; edge: number; desc?: string };

export default function GameCard({ game }: { game: Game }) {
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

      {game.desc && <p className="text-sm text-white/70 mt-1">{game.desc}</p>}
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
