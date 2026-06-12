interface SectionHeaderProps {
  title: string;
  sub?: string;
  role: 'admin' | 'socio';
}

export default function SectionHeader({ title, sub, role }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
          role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
        }`}>
          {role === 'admin' ? 'D' : 'S'}
        </div>
        <div>
          <span className="block text-[11px] font-bold text-slate-900">
            {role === 'admin' ? 'Directorio AFUSAMUT' : 'Socio/a Autenticado'}
          </span>
          <span className="text-[9px] text-slate-400">
            {role === 'admin' ? 'directiva@afusamut.cl' : 'Base Operativa Talcahuano'}
          </span>
        </div>
      </div>
    </div>
  );
}
