import GameCard, { Game } from "../../components/GameCard";

const games: Game[] = [
  { id: "blackjack", name: "Blackjack", status: "live",   edge: 0.5, desc: "Beat the dealer. 3:2 blackjack." },
  { id: "coinflip",  name: "Coin Flip", status: "paused", edge: 1.5, desc: "Fifty-fifty. Provably fair." },
  { id: "crash",     name: "Crash",     status: "paused", edge: 1.0, desc: "Cash out before it explodes." },
  { id: "towers",    name: "Towers",    status: "paused", edge: 1.2, desc: "Climb risk ladders; multiply." },
];

export default function GamesPage() {
  return (
    <section className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="badge badge-muted">Lobby</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Games</h1>
        </div>
        <span className="text-xs text-white/60">More titles soon</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
    </section>
  );
}
