import { useState } from 'react';
import { Search } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import { estatutosCapitulos } from '@/data/estatutos';
import type { RolPortal } from '@/types/app';

interface EstatutosTabProps {
  role: RolPortal;
}

export default function EstatutosTab({ role }: EstatutosTabProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <SectionHeader title="Estatutos Constitutivos" sub="Títulos, artículos y normativas de AFUSAMUT." role={role} />

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
          <input type="text" placeholder="Buscar en artículos estatutarios (ej: cuota, directorio, expulsión)…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
        </div>
      </div>

      <div className="space-y-4">
        {estatutosCapitulos.map((cap, ci) => {
          const arts = cap.articulos.filter(a =>
            !search ||
            a.texto.toLowerCase().includes(search.toLowerCase()) ||
            a.desc.toLowerCase().includes(search.toLowerCase())
          );
          if (!arts.length) return null;
          return (
            <div key={ci} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-emerald-950 text-white font-extrabold text-xs uppercase tracking-wider">{cap.titulo}</div>
              <div className="divide-y divide-slate-100">
                {arts.map(art => (
                  <div key={art.num} className="p-4 hover:bg-slate-50 transition space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded text-[10px]">Art. {art.num}</span>
                      <span className="font-bold text-slate-900 text-xs">{art.desc}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-1">{art.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {search && estatutosCapitulos.every(c =>
          c.articulos.every(a =>
            !a.texto.toLowerCase().includes(search.toLowerCase()) &&
            !a.desc.toLowerCase().includes(search.toLowerCase())
          )
        ) && (
          <div className="text-center py-10 text-slate-400 text-sm">
            No se encontraron artículos para "<strong>{search}</strong>"
          </div>
        )}
      </div>
    </div>
  );
}
