import { useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import StatCard from '@/components/ui/StatCard';
import type { MovimientoLocal, RolPortal, TriggerToast } from '@/types/app';
import type { TipoMovimiento } from '@/types';

interface FinanzasTabProps {
  role: RolPortal;
  finanzas: MovimientoLocal[];
  setFinanzas: React.Dispatch<React.SetStateAction<MovimientoLocal[]>>;
  triggerToast: TriggerToast;
}

export default function FinanzasTab({ role, finanzas, setFinanzas, triggerToast }: FinanzasTabProps) {
  const [form, setForm] = useState({ tipo: 'Egreso' as TipoMovimiento, concepto: '', monto: '' });

  const totalIngresos  = finanzas.filter(f => f.tipo === 'Ingreso').reduce((a, c) => a + c.monto, 0);
  const totalEgresos   = finanzas.filter(f => f.tipo === 'Egreso').reduce((a, c) => a + c.monto, 0);
  const cajaDisponible = totalIngresos - totalEgresos;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.concepto || !form.monto) return triggerToast('Complete concepto y monto.', 'error');
    setFinanzas(prev => [{
      id: prev.length + 1,
      tipo: form.tipo,
      concepto: form.concepto,
      monto: parseInt(form.monto),
      fecha: new Date().toISOString().split('T')[0],
    }, ...prev]);
    setForm({ tipo: 'Egreso', concepto: '', monto: '' });
    triggerToast('Transacción registrada en caja.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Finanzas, Caja y Transparencia" sub="Control de caja, historial contable y rendición de fondos gremiales." role={role} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Ingresos" value={`$${totalIngresos.toLocaleString('es-CL')}`}  sub="Suscripciones + Aportes"      color="text-emerald-700"/>
        <StatCard label="Total Egresos"  value={`$${totalEgresos.toLocaleString('es-CL')}`}   sub="Asesorías + Administrativo"  color="text-red-600"/>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wide mb-1">Caja Activa Disponible</span>
          <span className="text-2xl font-extrabold text-emerald-900">${cajaDisponible.toLocaleString('es-CL')}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Saldo neto en cuenta bancaria</span>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${role === 'admin' ? 'lg:grid-cols-12' : ''} gap-6`}>
        {role === 'admin' && (
          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-700"/>Registrar Movimiento
            </h3>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-lg border">
                {(['Ingreso', 'Egreso'] as TipoMovimiento[]).map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                    className={`py-1.5 text-xs font-bold rounded transition ${
                      form.tipo === t
                        ? t === 'Ingreso' ? 'bg-emerald-800 text-white' : 'bg-red-600 text-white'
                        : 'text-slate-600'
                    }`}>
                    {t} {t === 'Ingreso' ? '(+)' : '(-)'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Concepto / Glosa *</label>
                <input type="text" placeholder="Ej: Pago asesoría jurídica" value={form.concepto} required
                  onChange={e => setForm({ ...form, concepto: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Monto ($ CLP) *</label>
                <input type="number" placeholder="Ej: 50000" value={form.monto} required min="1"
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
              </div>
              <button type="submit" className="w-full py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 transition">
                Registrar en Caja
              </button>
            </form>
          </div>
        )}

        <div className={`${role === 'admin' ? 'lg:col-span-8' : ''} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">Libro de Caja — Historial Contable</h3>
            <button onClick={() => triggerToast('Libro de caja listo para imprimir.')}
              className="text-emerald-800 hover:text-emerald-950 text-xs font-bold flex items-center gap-1">
              <Printer className="w-4 h-4"/> Imprimir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold border-b">
                  <th className="p-3">ID</th><th className="p-3">Fecha</th>
                  <th className="p-3">Concepto</th><th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finanzas.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-400">#MOV-{String(f.id).padStart(3, '0')}</td>
                    <td className="p-3 text-slate-600">{f.fecha}</td>
                    <td className="p-3 font-semibold text-slate-800">{f.concepto}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.tipo === 'Ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {f.tipo}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-bold ${f.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {f.tipo === 'Ingreso' ? '+' : '-'}${f.monto.toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
