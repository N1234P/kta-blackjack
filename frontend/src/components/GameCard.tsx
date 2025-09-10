export type Game = { id: string; name: string; status: "live" | "paused"; edge: number };


export default function GameCard({ game }: { game: Game }) {
return (
<div className="card p-4">
<div className="flex items-center justify-between">
<h3 className="text-lg font-semibold">{game.name}</h3>
<span className={`badge ${game.status === "live" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}`}>
{game.status.toUpperCase()}
</span>
</div>
<p className="text-sm text-[--color-muted] mt-2">House edge: {game.edge}%</p>
<button className="btn btn-brand mt-4 text-sm">Play</button>
</div>
);
}