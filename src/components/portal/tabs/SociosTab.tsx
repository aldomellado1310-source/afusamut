import { useState } from 'react';
import { Search, Plus, FileSpreadsheet } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import type { SocioLocal, RolPortal, TriggerToast } from '@/types/app';
import type { Estamento, CalidadSocio } from '@/types';

interface SociosTabProps {
  role: RolPortal;
  socios: SocioLocal[];
  setSocios: React.Dispatch<React.SetStateAction<SocioLocal[]>>;
  triggerToast: TriggerToast;
}

const ESTAMENTOS: Estamento[] = ['Enfermería', 'TENS', 'Conductores', 'Administrativo'];
const CALIDADES: CalidadSocio[] = ['Titular', 'Contrata', 'Reemplazo'];

export default function SociosTab({ role, socios, setSocios, triggerToast }: SociosTabProps) {
  const [search, setSearch]       = useState('');
  const [estamento, setEstamento] = useState('Todos');
  const [form, setForm]           = useState({ rut: '', nombre: '', estamento: 'Enfermería' as Estamento, cargo: '', calidad: 'Titular' as CalidadSocio });

  const filtrados = socios.filter(s => {
    const okSearch    = s.nombre.toLowerCase().includes(search.toLowerCase()) || s.rut.includes(search);
    const okEstamento = estamento === 'Todos' || s.estamento === estamento;
    return okSearch && okEstamento;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rut || !form.nombre || !form.cargo) return triggerToast('Complete todos los campos requeridos.', 'error');
    setSocios(prev => [{ id: prev.length + 1, ...form, pagoCuota: 'Al Día', cuotasPagadas: 0 }, ...prev]);
    setForm({ rut: '', nombre: '', estamento: 'Enfermería', cargo: '', calidad: 'Titular' });
    triggerToast('Socio incorporado al padrón oficial.');
  };

  const togglePago = (id: number) => {
    setSocios(prev => prev.map(s => {
      if (s.id !== id) return s;
      const alDia = s.pagoCuota !== 'Al Día';
      return { ...s, pagoCuota: alDia ? 'Al Día' : 'Pendiente', cuotasPagadas: alDia ? s.cuotasPagadas + 1 : Math.max(0, s.cuotasPagadas - 1) };
    }));
    triggerToast('Estado de cuota actualizado.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Gestión y Padrón de Socios" sub="Nómina oficial de afiliados de todas las bases de Talcahuano." role={role} />

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/>
          <input type="text" placeholder="Buscar por nombre o RUT…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
        </div>
        <select value={estamento} onChange={e => setEstamento(e.target.value)}
          className="border rounded-lg text-sm px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-700">
          {['Todos', ...ESTAMENTOS].map(e => <option key={e}>{e}</option>)}
        </select>
        <span className="text-xs text-slate-500 font-bold ml-auto shrink-0">
          {filtrados.length} socio{filtrados.length !== 1 ? 's' : ''} filtrados
        </span>
      </div>

      <div className={`grid grid-cols-1 ${role === 'admin' ? 'lg:grid-cols-12' : ''} gap-6`}>
        {/* Formulario de inscripción (solo admin) */}
        {role === 'admin' && (
          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-700"/>Inscribir Socio en Padrón
            </h3>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              {([['RUT *', 'text', 'Ej: 12.345.678-9', 'rut'], ['Nombre Completo *', 'text', 'Ej: Juan Pérez Muñoz', 'nombre'], ['Cargo Específico *', 'text', 'Ej: Reanimador / Conductor Móvil', 'cargo']] as const).map(([label, type, ph, key]) => (
                <div key={key}>
                  <label className="block text-slate-600 font-bold mb-1">{label}</label>
                  <input type={type} placeholder={ph} value={form[key]} required
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Estamento</label>
                  <select value={form.estamento} onChange={e => setForm({ ...form, estamento: e.target.value as Estamento })}
                    className="w-full p-2 border rounded-lg text-xs">
                    {ESTAMENTOS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Calidad</label>
                  <select value={form.calidad} onChange={e => setForm({ ...form, calidad: e.target.value as CalidadSocio })}
                    className="w-full p-2 border rounded-lg text-xs">
                    {CALIDADES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 transition">
                Confirmar Incorporación
              </button>
            </form>
          </div>
        )}

        {/* Tabla padrón */}
        <div className={`${role === 'admin' ? 'lg:col-span-8' : ''} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">Padrón Electoral Oficial</h3>
            <button onClick={() => triggerToast('Padrón exportado en formato CSV.')}
              className="text-emerald-800 hover:text-emerald-950 text-xs font-bold flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4"/> Exportar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold border-b">
                  <th className="p-3">Socio/a</th>
                  <th className="p-3">RUT</th>
                  <th className="p-3">Estamento / Cargo</th>
                  <th className="p-3">Calidad</th>
                  <th className="p-3 text-center">Cuota</th>
                  {role === 'admin' && <th className="p-3 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{s.nombre}</div>
                      <span className="text-[9px] text-slate-400">AFUS-{String(s.id).padStart(3, '0')}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{s.rut}</td>
                    <td className="p-3">
                      <div className="font-semibold">{s.estamento}</div>
                      <div className="text-[10px] text-slate-500">{s.cargo}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.calidad === 'Titular' ? 'bg-blue-100 text-blue-800'
                          : s.calidad === 'Contrata' ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {s.calidad}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.pagoCuota === 'Al Día' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {s.pagoCuota}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-0.5">{s.cuotasPagadas} meses</div>
                    </td>
                    {role === 'admin' && (
                      <td className="p-3 text-center">
                        <button onClick={() => togglePago(s.id)}
                          className="text-[10px] px-2.5 py-1 bg-slate-100 border rounded-lg hover:bg-emerald-950 hover:text-white transition font-semibold">
                          Invertir
                        </button>
                      </td>
                    )}
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
