import { AlertCircle, Clock } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import StatCard from '@/components/ui/StatCard';
import type { RolPortal, MovimientoLocal, VotacionLocal, TicketLocal } from '@/types/app';

interface InicioTabProps {
  role: RolPortal;
  finanzas: MovimientoLocal[];
  socios: { length: number };
  votaciones: VotacionLocal[];
  buzon: TicketLocal[];
}

export default function InicioTab({ role, finanzas, socios, votaciones, buzon }: InicioTabProps) {
  const totalIngresos = finanzas.filter(f => f.tipo === 'Ingreso').reduce((a, c) => a + c.monto, 0);
  const totalEgresos  = finanzas.filter(f => f.tipo === 'Egreso').reduce((a, c) => a + c.monto, 0);
  const cajaDisponible = totalIngresos - totalEgresos;

  return (
    <div className="space-y-6">
      <SectionHeader title="Inicio y Comunicados" sub="Últimos avisos, circulares y contingencia SAMU." role={role} />

      <div className="p-6 bg-gradient-to-r from-emerald-900 to-emerald-950 rounded-2xl text-white shadow-lg">
        <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">Urgente</span>
        <h2 className="text-xl font-black mt-2">¡Asociación Constituida con Éxito!</h2>
        <p className="text-xs text-emerald-200 mt-2 leading-relaxed max-w-xl">
          El 9 de abril de 2026 formalizamos AFUSAMUT en la Inspección del Trabajo. Estamos iniciando el registro masivo del padrón. ¡Invita a tus compañeros de base!
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Caja Disponible"    value={`$${cajaDisponible.toLocaleString('es-CL')}`}              sub="Saldo neto gremial"            color="text-emerald-700"/>
        <StatCard label="Socios Registrados" value={socios.length}                                              sub="Titulares, contratas, reemplazos"/>
        <StatCard label="Votaciones Activas" value={votaciones.filter(v => v.estado === 'Activa').length}       sub="Disponibles para sufragar"     color="text-amber-600"/>
        <StatCard label="Soporte Pendiente"  value={buzon.filter(b => b.estado === 'Pendiente').length}         sub="Requerimientos por responder"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-700"/>Comunicaciones Oficiales del Directorio
          </h3>
          {[
            { badge:'bg-emerald-100 text-emerald-800', tipo:'Comunicado General', fecha:'15 Abr 2026',
              titulo:'Inicio del Proceso de Descuento de Cuotas por Planilla',
              texto:'Se entregó al área de remuneraciones del Servicio de Salud Talcahuano la nómina de socios titulares y contratas para iniciar el descuento automático de $4.000 mensuales. Los reemplazantes deben coordinar con tesorería.' },
            { badge:'bg-amber-100 text-amber-800', tipo:'Capacitación', fecha:'10 Abr 2026',
              titulo:'Convenio de Formación en Trauma Prehospitalario Avanzado',
              texto:'Estamos en conversaciones para firmar una alianza con un centro de capacitación nacional con hasta 40% de descuento para los socios. Prontamente publicaremos los detalles.' },
          ].map(c => (
            <div key={c.titulo} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className={`${c.badge} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{c.tipo}</span>
                <span className="text-slate-400 text-xs">{c.fecha}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{c.titulo}</h4>
              <p className="text-slate-600 text-xs leading-relaxed">{c.texto}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm">Próximos Hitos Gremiales</h4>
          {[
            { titulo:'Asamblea General Ordinaria', sub:'Junio 2026 — Telemática + Presencial' },
            { titulo:'Rendición de Caja Semestral', sub:'Julio 2026 — Por Tesorería' },
          ].map(h => (
            <div key={h.titulo} className="flex items-start gap-3 text-xs border-b pb-3 last:border-0">
              <Clock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"/>
              <div>
                <span className="font-bold block">{h.titulo}</span>
                <span className="text-slate-500">{h.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
