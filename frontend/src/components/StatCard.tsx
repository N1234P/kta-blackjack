export default function StatCard({ label, value }: { label: string; value: string }) {
return (
<div className="card p-4">
<div className="text-xs text-[--color-muted]">{label}</div>
<div className="text-xl font-semibold mt-1">{value}</div>
</div>
);
}