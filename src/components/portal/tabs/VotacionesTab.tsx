import { useState } from 'react';
import { Shield, Plus } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import type { VotacionLocal, SocioLocal, RolPortal, TriggerToast } from '@/types/app';

interface VotacionesTabProps {
  role: RolPortal;
  socios: SocioLocal[];
  votaciones: VotacionLocal[];
  setVotaciones: React.Dispatch<React.SetStateAction<VotacionLocal[]>>;
  onEmitirVoto: (votacion: VotacionLocal) => void;
  triggerToast: TriggerToast;
}

export default function VotacionesTab({ role, socios, votaciones, setVotaciones, onEmitirVoto, triggerToast }: VotacionesTabProps) {
  const [form, setForm] = useState({ titulo: '', opciones: '', ministroFe: 'Autogestionado por Directorio' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.opciones) return triggerToast('Rellene título y opciones.', 'error');
    const opts = form.opciones.split(',').map(o => o.trim()).filter(Boolean);
    setVotaciones(prev => [{
      id: prev.length + 1,
      titulo: form.titulo,
      tipo: 'Asamblea Extraordinaria',
      estado: 'Activa',
      votosRecibidos: 0,
      padronTotal: socios.length,
      opciones: [...opts, 'Blanco / Nulo'],
      votosPorOpcion: Array(opts.length + 1).fill(0),
      votoEmitido: false,
      ministroFe: form.ministroFe,
    }, ...prev]);
    setForm({ titulo: '', opciones: '', ministroFe: 'Autogestionado por Directorio' });
    triggerToast('Votación digital iniciada.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Votaciones Digitales y Escrutinios" sub="Procesos de sufragio con ministro de fe digital e inalterabilidad de actas." role={role} />

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-xs shadow-sm">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-1.5">
          <Shield className="w-4 h-4 text-amber-600"/>Cumplimiento Legal — Dirección del Trabajo
        </h4>
        <p className="text-slate-600 leading-relaxed">
          Conforme al <strong>Dictamen N° 2532/48</strong>, las votaciones pueden efectuarse telemáticamente garantizando <strong>universalidad, secreto de voto y no-repudio</strong>. El sistema valida identidad sin vincular al candidato elegido.
        </p>
      </div>

      {role === 'admin' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-700"/>Iniciar Nueva Votación
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-end">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Título *</label>
              <input type="text" placeholder="Ej: Elección Delegado de Base" value={form.titulo} required
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                className="w-full p-2 border rounded-lg"/>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Opciones (separadas por coma) *</label>
              <input type="text" placeholder="Opción A, Opción B" value={form.opciones} required
                onChange={e => setForm({ ...form, opciones: e.target.value })}
                className="w-full p-2 border rounded-lg"/>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-slate-600 font-bold mb-1">Ministro de Fe</label>
                <select value={form.ministroFe} onChange={e => setForm({ ...form, ministroFe: e.target.value })}
                  className="w-full p-2 border rounded-lg">
                  <option value="Autogestionado por Directorio">Directorio AFUSAMUT</option>
                  <option value="Inspección del Trabajo Talcahuano (Digital)">Inspección DT Digital</option>
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 h-fit self-end text-xs">
                Lanzar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {votaciones.map(v => {
          const pct = Math.round((v.votosRecibidos / v.padronTotal) * 100);
          return (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-5 space-y-4 flex-1">
                <div className="flex justify-between items-start">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${v.estado === 'Activa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {v.estado === 'Activa' ? '● Votación Activa' : 'Votación Finalizada'}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">VOT-{String(v.id).padStart(3, '0')}</span>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">{v.titulo}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Ministro de Fe: {v.ministroFe}</p>
                </div>
                <div className="space-y-1.5 pt-2 border-t text-xs">
                  <div className="flex justify-between text-slate-600 font-semibold">
                    <span>Participación</span>
                    <span>{v.votosRecibidos}/{v.padronTotal} sufragios ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
                {(v.votoEmitido || v.estado === 'Finalizada') && (
                  <div className="bg-slate-50 p-4 rounded-xl border space-y-2.5 text-xs">
                    <span className="font-bold text-slate-800 block">Resultados parciales:</span>
                    {v.opciones.map((op, i) => {
                      const c = v.votosPorOpcion[i] || 0;
                      const p = v.votosRecibidos > 0 ? Math.round((c / v.votosRecibidos) * 100) : 0;
                      return (
                        <div key={op}>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="font-semibold truncate pr-2">{op}</span>
                            <span className="font-mono shrink-0">{c} ({p}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${p}%` }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex justify-end">
                {v.estado === 'Activa' ? (
                  <button onClick={() => onEmitirVoto(v)} disabled={v.votoEmitido}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                      v.votoEmitido ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-950 text-white hover:bg-emerald-900'
                    }`}>
                    {v.votoEmitido ? '✓ Sufragio Emitido' : 'Emitir Sufragio Seguro'}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold py-1.5">Proceso Cerrado y Escrutado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
