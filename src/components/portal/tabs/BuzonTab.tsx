import { useState } from 'react';
import { Send } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import type { TicketLocal, RolPortal, TriggerToast } from '@/types/app';

interface BuzonTabProps {
  role: RolPortal;
  buzon: TicketLocal[];
  setBuzon: React.Dispatch<React.SetStateAction<TicketLocal[]>>;
  triggerToast: TriggerToast;
}

const CATEGORIAS = ['Consultas Gremiales', 'Seguridad y Salud Laboral', 'Convenios e Incorporación', 'Apoyo Jurídico / Ley 19.296'];

export default function BuzonTab({ role, buzon, setBuzon, triggerToast }: BuzonTabProps) {
  const [form, setForm]       = useState({ categoria: CATEGORIAS[0], mensaje: '' });
  const [replies, setReplies] = useState<Record<number, string>>({});

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mensaje) return triggerToast('El mensaje no puede estar vacío.', 'error');
    setBuzon(prev => [{
      id: prev.length + 1,
      socio: role === 'admin' ? 'Directorio AFUSAMUT' : 'Socio Autenticado',
      categoria: form.categoria,
      mensaje: form.mensaje,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'Pendiente',
      respuesta: null,
    }, ...prev]);
    setForm({ categoria: CATEGORIAS[0], mensaje: '' });
    triggerToast('Consulta enviada al Directorio de forma segura.');
  };

  const handleReply = (id: number) => {
    const txt = replies[id] || '';
    if (!txt.trim()) return triggerToast('Escriba una respuesta antes de enviar.', 'error');
    setBuzon(prev => prev.map(b => b.id === id ? { ...b, respuesta: txt, estado: 'Resuelto' } : b));
    setReplies(prev => { const n = { ...prev }; delete n[id]; return n; });
    triggerToast('Respuesta enviada al socio.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Buzón de Sugerencias y Consultas" sub="Canal directo de comunicación entre socios y el Directorio AFUSAMUT." role={role} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de envío */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-700"/>Enviar Mensaje al Directorio
          </h3>
          <form onSubmit={handleSend} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                className="w-full p-2 border rounded-lg">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Mensaje *</label>
              <textarea rows={4} placeholder="Escriba su consulta o requerimiento con claridad…"
                value={form.mensaje} required
                onChange={e => setForm({ ...form, mensaje: e.target.value })}
                className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
            </div>
            <button type="submit" className="w-full py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 transition">
              Enviar Requerimiento Seguro
            </button>
          </form>
        </div>

        {/* Bandeja */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b">
            <h3 className="font-bold text-slate-900 text-sm">Bandeja de Requerimientos</h3>
          </div>
          <div className="p-4 space-y-4">
            {buzon.map(b => (
              <div key={b.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-900 block">{b.socio}</span>
                    <span className="text-[10px] text-slate-400">{b.fecha} · {b.categoria}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${b.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {b.estado}
                  </span>
                </div>
                <p className="text-slate-700 italic bg-white p-3 rounded-lg border">"{b.mensaje}"</p>
                {b.respuesta ? (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-900 block text-[10px] uppercase tracking-wide">Respuesta del Directorio:</span>
                    <p className="text-slate-700">"{b.respuesta}"</p>
                  </div>
                ) : role === 'admin' && (
                  <div className="pt-2 border-t space-y-2">
                    <label className="block font-bold text-slate-700">Responder como Directorio:</label>
                    <textarea rows={2} placeholder="Escriba la respuesta oficial…"
                      value={replies[b.id] || ''}
                      onChange={e => setReplies(prev => ({ ...prev, [b.id]: e.target.value }))}
                      className="w-full p-2 border rounded-lg bg-white resize-none focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                    <button onClick={() => handleReply(b.id)}
                      className="px-3 py-1.5 bg-emerald-950 text-white font-bold rounded-lg text-[10px] hover:bg-emerald-900">
                      Enviar Respuesta Oficial
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
