import { Users, DollarSign, Vote, Gift, FileText, Layers, MessageSquare, Menu, X } from 'lucide-react';
import AfusamutLogo from '@/components/ui/AfusamutLogo';
import NavBtn from '@/components/ui/NavBtn';
import InicioTab     from './tabs/InicioTab';
import SociosTab     from './tabs/SociosTab';
import FinanzasTab   from './tabs/FinanzasTab';
import VotacionesTab from './tabs/VotacionesTab';
import BeneficiosTab from './tabs/BeneficiosTab';
import EstatutosTab  from './tabs/EstatutosTab';
import BuzonTab      from './tabs/BuzonTab';
import { signOut }   from '@/services/authService';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { RolPortal, VistaApp, SocioLocal, MovimientoLocal, VotacionLocal, TicketLocal, TriggerToast } from '@/types/app';

interface PortalShellProps {
  role: RolPortal;
  setRole: (r: RolPortal) => void;
  portalTab: string;
  setPortalTab: (t: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  setView: (v: VistaApp) => void;
  triggerToast: TriggerToast;
  socios: SocioLocal[];
  setSocios: React.Dispatch<React.SetStateAction<SocioLocal[]>>;
  finanzas: MovimientoLocal[];
  setFinanzas: React.Dispatch<React.SetStateAction<MovimientoLocal[]>>;
  votaciones: VotacionLocal[];
  setVotaciones: React.Dispatch<React.SetStateAction<VotacionLocal[]>>;
  buzon: TicketLocal[];
  setBuzon: React.Dispatch<React.SetStateAction<TicketLocal[]>>;
  onEmitirVoto: (votacion: VotacionLocal) => void;
  demoMode?: boolean;
}

const NAV_ITEMS = [
  { tab: 'inicio',     icon: Layers,        label: 'Inicio & Avisos'    },
  { tab: 'socios',     icon: Users,         label: 'Padrón de Socios'   },
  { tab: 'finanzas',   icon: DollarSign,    label: 'Finanzas y Caja'    },
  { tab: 'votaciones', icon: Vote,          label: 'Votaciones y Actas' },
  { tab: 'beneficios', icon: Gift,          label: 'Club de Beneficios' },
  { tab: 'estatutos',  icon: FileText,      label: 'Estatutos Oficiales'},
  { tab: 'buzon',      icon: MessageSquare, label: 'Buzón Gremial'      },
];

export default function PortalShell(props: PortalShellProps) {
  const {
    role, setRole, portalTab, setPortalTab,
    mobileMenuOpen, setMobileMenuOpen, setView, triggerToast,
    socios, setSocios, finanzas, setFinanzas,
    votaciones, setVotaciones, buzon, setBuzon,
    onEmitirVoto, demoMode = true,
  } = props;

  const switchRole = (r: RolPortal) => {
    setRole(r);
    triggerToast(`Vista: ${r === 'admin' ? 'Directorio' : 'Socio/a'}`);
  };

  const handleSalir = async () => {
    if (isFirebaseConfigured) {
      await signOut();
    }
    setView('landing');
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-1 min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="w-64 shrink-0 bg-emerald-950 text-emerald-100 flex-col border-r border-emerald-900 hidden md:flex">
        <div className="p-4 bg-emerald-900/60 border-b border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AfusamutLogo className="w-9 h-9"/>
            <div>
              <h2 className="font-black text-sm text-white leading-none">AFUSAMUT</h2>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${role === 'admin' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {role === 'admin' ? 'Modo Directorio' : 'Modo Afiliado/a'}
              </span>
            </div>
          </div>
          <button onClick={handleSalir} className="text-[10px] text-emerald-300 hover:text-white bg-emerald-950/60 px-2 py-1 rounded-lg">
            Salir
          </button>
        </div>

        {/* Role switcher — only in demo mode */}
        {demoMode && (
          <div className="px-3 py-3 border-b border-emerald-800/60">
            <span className="text-[9px] text-emerald-400 uppercase font-bold block mb-1.5 tracking-widest">Simular rol:</span>
            <div className="grid grid-cols-2 gap-1 bg-emerald-950 p-1 rounded-lg border border-emerald-800">
              {(['socio', 'admin'] as RolPortal[]).map(r => (
                <button key={r} onClick={() => switchRole(r)}
                  className={`py-1 text-xs font-bold rounded transition ${role === r ? 'bg-amber-500 text-emerald-950' : 'text-emerald-300 hover:text-white'}`}>
                  {r === 'socio' ? 'Socio/a' : 'Directorio'}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavBtn key={item.tab} tab={item.tab} icon={item.icon} label={item.label} activeTab={portalTab} onClick={setPortalTab}/>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-900 text-[10px] text-emerald-400">
          <p className="font-bold text-emerald-200">AFUSAMUT Talcahuano</p>
          <p>Ley 19.296 · Biobío · Chile</p>
          {demoMode && <p className="mt-1 text-amber-400/60 italic">Modo demo activo</p>}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-emerald-950 border-b border-emerald-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AfusamutLogo className="w-8 h-8"/>
          <span className="font-black text-sm text-white">AFUSAMUT</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-emerald-200 hover:text-white p-1">
          {mobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-50 bg-emerald-950 border-b border-emerald-900 px-3 py-3 space-y-1 shadow-xl">
          {NAV_ITEMS.map(({ tab, label }) => (
            <button key={tab} onClick={() => { setPortalTab(tab); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${portalTab === tab ? 'bg-amber-500 text-emerald-950' : 'text-emerald-100 hover:bg-emerald-900'}`}>
              {label}
            </button>
          ))}
          <button onClick={handleSalir} className="w-full text-left px-3 py-2 text-sm text-red-300 font-semibold">
            ← Salir del Portal
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 bg-slate-50 p-4 sm:p-8 overflow-y-auto md:min-h-0 mt-12 md:mt-0">
        {portalTab === 'inicio'     && <InicioTab     role={role} finanzas={finanzas} socios={socios} votaciones={votaciones} buzon={buzon}/>}
        {portalTab === 'socios'     && <SociosTab     role={role} socios={socios}     setSocios={setSocios}   triggerToast={triggerToast}/>}
        {portalTab === 'finanzas'   && <FinanzasTab   role={role} finanzas={finanzas} setFinanzas={setFinanzas} triggerToast={triggerToast}/>}
        {portalTab === 'votaciones' && <VotacionesTab role={role} socios={socios}     votaciones={votaciones}  setVotaciones={setVotaciones} onEmitirVoto={onEmitirVoto} triggerToast={triggerToast}/>}
        {portalTab === 'beneficios' && <BeneficiosTab role={role} triggerToast={triggerToast}/>}
        {portalTab === 'estatutos'  && <EstatutosTab  role={role}/>}
        {portalTab === 'buzon'      && <BuzonTab      role={role} buzon={buzon} setBuzon={setBuzon} triggerToast={triggerToast}/>}
      </main>
    </div>
  );
}
