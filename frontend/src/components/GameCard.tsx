import Link from "next/link";

export type Game = {
  id: string;
  name: string;
  status: "live" | "paused";
  edge: number;
  desc?: string;
};

export default function GameCard({ game }: { game: Game }) {
  const isLive = game.status === "live";

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-b from-white/[0.06] to-transparent p-4",
        "transition-transform duration-200 hover:-translate-y-0.5",
        "shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
      ].join(" ")}
      role="article"
      aria-label={game.name}
    >
      {/* rim light */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />

      {/* subtle decorative glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--color-brand)]/15 blur-3xl"
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">{game.name}</h3>

        <span
          className={[
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border",
            isLive
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-white/10 text-white/70 border-white/20",
          ].join(" ")}
        >
          {isLive && (
            <span className="relative inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-400/40 blur-[1.5px] animate-pulse" />
            </span>
          )}
          {isLive ? "LIVE" : "COMING SOON"}
        </span>
      </div>

      {/* Body */}
      {game.desc && <p className="mt-1 text-sm text-white/70">{game.desc}</p>}

      <div className="mt-1 text-xs text-white/60">
        House edge: <span className="font-medium text-white/80">{game.edge}%</span>
      </div>

      {/* CTA */}
      {isLive ? (
        <Link
          href={`/${game.id}`}
          className={[
            "mt-4 inline-flex items-center gap-1 rounded-xl btn btn-brand px-4 py-2 text-sm",
            "hover:opacity-90 focus-visible:outline-none focus-visible:k-ring",
          ].join(" ")}
          aria-label={`Play ${game.name}`}
        >
          Play <span aria-hidden>→</span>
        </Link>
      ) : (
        <button
          disabled
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-zinc-500 cursor-not-allowed"
          aria-disabled="true"
          aria-label={`${game.name} coming soon`}
        >
          Coming Soon
        </button>
      )}
    </div>
  );
}
