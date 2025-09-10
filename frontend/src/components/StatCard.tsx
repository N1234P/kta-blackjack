export default function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4 bg-gradient-to-b from-white/5 to-transparent">
      <div className="text-[10px] tracking-wide uppercase text-white/60">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
