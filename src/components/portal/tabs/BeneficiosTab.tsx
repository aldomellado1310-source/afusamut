import { Award } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import type { RolPortal, TriggerToast } from '@/types/app';

interface BeneficiosTabProps {
  role: RolPortal;
  triggerToast: TriggerToast;
}

const BENEFICIOS = [
  { badge: 'bg-blue-100 text-blue-800',   tipo: 'Salud & Farmacia',    titulo: 'Farmacias Red Popular Talcahuano',
    texto: 'Descuento del 15% en medicamentos de catálogo y 5% adicional en medicamentos críticos para socios y sus cargas familiares.',
    codigo: 'POP-AFUSA' },
  { badge: 'bg-purple-100 text-purple-800', tipo: 'Esparcimiento',      titulo: 'Cabañas de Veraneo Tomé-Dichato',
    texto: 'Tarifas especiales fuera de temporada con hasta 30% de rebaja para descanso del personal AFUSAMUT. Requiere reserva con 15 días de anticipación.',
    codigo: 'DICH-AFUSAMUT' },
  { badge: 'bg-amber-100 text-amber-800',  tipo: 'Educación',           titulo: 'Centro de Capacitación Prehospitalaria',
    texto: 'Becas del 20% para cursos de Reanimación Avanzada Pediátrica y de Adultos para mantener la acreditación obligatoria vigente.',
    codigo: 'ACAD-SAMU26' },
];

export default function BeneficiosTab({ role, triggerToast }: BeneficiosTabProps) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Club de Alianzas y Beneficios" sub="Cupones y descuentos exclusivos para funcionarios SAMU Talcahuano." role={role} />

      <div className="bg-emerald-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow">
        <div className="space-y-2">
          <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">Alianzas 2026</span>
          <h3 className="text-xl font-black">Club de Beneficios AFUSAMUT</h3>
          <p className="text-xs text-emerald-200 max-w-lg">
            Gracias a nuestra formalización legal, hemos comenzado a cerrar importantes convenios con comercios de la Región del Biobío para todos los funcionarios del SAMU.
          </p>
        </div>
        <Award className="w-16 h-16 text-amber-400 shrink-0"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {BENEFICIOS.map(b => (
          <div key={b.titulo} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-5 space-y-3 flex-1">
              <span className={`${b.badge} text-[10px] font-bold px-2.5 py-0.5 rounded-full`}>{b.tipo}</span>
              <h4 className="font-bold text-slate-900">{b.titulo}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{b.texto}</p>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
              <span className="text-xs text-slate-500 font-mono">{b.codigo}</span>
              <button onClick={() => triggerToast(`Cupón ${b.codigo} generado. Presentar en el comercio asociado.`)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 transition">
                Generar Cupón →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
