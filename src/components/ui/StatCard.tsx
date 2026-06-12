interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color = 'text-slate-900' }: StatCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide mb-1">{label}</span>
      <span className={`text-2xl font-extrabold ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-slate-400 block mt-0.5">{sub}</span>}
    </div>
  );
}
