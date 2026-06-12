import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import type { VotacionLocal, SocioLocal, TriggerToast } from '@/types/app';

interface VotacionModalProps {
  votacion: VotacionLocal;
  socios: SocioLocal[];
  onClose: () => void;
  onVotoCastado: (votacionId: number, opcion: string) => void;
  triggerToast: TriggerToast;
}

export default function VotacionModal({ votacion, socios, onClose, onVotoCastado, triggerToast }: VotacionModalProps) {
  const [selectedOption, setSelectedOption] = useState('');
  const [securityRut, setSecurityRut]       = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || !securityRut) return triggerToast('Ingrese su RUT y seleccione una opción.', 'error');
    const socioOk = socios.find(s =>
      s.rut.replace(/\s/g, '').toLowerCase() === securityRut.replace(/\s/g, '').toLowerCase()
    );
    if (!socioOk) return triggerToast('RUT no registrado en el padrón de AFUSAMUT.', 'error');
    onVotoCastado(votacion.id, selectedOption);
    triggerToast('Sufragio emitido de forma secreta e irreversible.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 bg-emerald-950 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-sm">Urna Digital AFUSAMUT</h3>
            <span className="text-[10px] text-emerald-300">Secreto del Sufragio · Ley N° 19.296</span>
          </div>
          <button onClick={onClose} className="text-emerald-300 hover:text-white p-1"><X className="w-5 h-5"/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border space-y-1">
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Consulta en curso</span>
            <p className="font-black text-slate-900 text-sm leading-tight">{votacion.titulo}</p>
            <span className="text-[10px] text-slate-500">Fe: {votacion.ministroFe}</span>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-700 block">Seleccione su opción:</span>
            {votacion.opciones.map(op => (
              <label key={op} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                selectedOption === op ? 'border-emerald-700 bg-emerald-50 font-bold text-emerald-900' : 'bg-white hover:bg-slate-50'
              }`}>
                <input type="radio" name="voto" value={op} checked={selectedOption === op}
                  onChange={() => setSelectedOption(op)} className="accent-emerald-700"/>
                <span>{op}</span>
              </label>
            ))}
          </div>

          <div className="pt-2 border-t space-y-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-600"/>Validación de identidad
            </span>
            <p className="text-[10px] text-slate-500 leading-normal">
              Su RUT valida que es un socio registrado. No se vincula a la opción elegida, garantizando el secreto del voto.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1">RUT del Afiliado *</label>
                <input type="text" placeholder="Ej: 15.421.902-3" value={securityRut} required
                  onChange={e => setSecurityRut(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Clave (simulada)</label>
                <input type="password" placeholder="••••••••"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose}
              className="py-2.5 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button type="submit"
              className="py-2.5 bg-emerald-950 text-white font-bold rounded-xl hover:bg-emerald-900 transition">
              Depositar Voto Secreto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
