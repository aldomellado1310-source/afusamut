import { useState, useCallback } from 'react';
import LandingPage    from '@/components/landing/LandingPage';
import PortalShell    from '@/components/portal/PortalShell';
import VotacionModal  from '@/components/portal/VotacionModal';
import ProtectedPortal from '@/components/auth/ProtectedPortal';
import Toast          from '@/components/ui/Toast';
import { useAuth }    from '@/contexts/AuthContext';
import { useFirestoreCol } from '@/hooks/useFirestoreCol';
import { subscribeSocios }     from '@/services/sociosService';
import { subscribeFinanzas }   from '@/services/finanzasService';
import { subscribeVotaciones } from '@/services/votacionesService';
import { subscribeBuzon }      from '@/services/buzonService';
import type { ToastData } from '@/components/ui/Toast';
import type { RolPortal, VistaApp, SocioLocal, MovimientoLocal, VotacionLocal, TicketLocal } from '@/types/app';

// ── Demo data (used when Firebase is not configured) ──────────────────────────
const SOCIOS_DEMO: SocioLocal[] = [
  { id: 1, rut: '15.421.902-3', nombre: 'Alejandro Sanhueza',  estamento: 'Enfermería',     cargo: 'Reanimador SAMU',         calidad: 'Titular',   pagoCuota: 'Al Día',    cuotasPagadas: 12 },
  { id: 2, rut: '17.112.554-K', nombre: 'Valeska Cid',         estamento: 'TENS',           cargo: 'TENS Reguladora',         calidad: 'Contrata',  pagoCuota: 'Al Día',    cuotasPagadas: 12 },
  { id: 3, rut: '12.890.432-1', nombre: 'Héctor Fuentealba',   estamento: 'Conductores',    cargo: 'Conductor de Emergencia', calidad: 'Titular',   pagoCuota: 'Al Día',    cuotasPagadas: 11 },
  { id: 4, rut: '18.345.112-9', nombre: 'Constanza Barra',     estamento: 'Administrativo', cargo: 'Apoyo Logístico',         calidad: 'Contrata',  pagoCuota: 'Pendiente', cuotasPagadas: 9  },
  { id: 5, rut: '16.712.901-5', nombre: 'Rodrigo Toledo',      estamento: 'Conductores',    cargo: 'Conductor Avanzado',      calidad: 'Reemplazo', pagoCuota: 'Al Día',    cuotasPagadas: 3  },
  { id: 6, rut: '14.908.332-6', nombre: 'Claudia Orellana',    estamento: 'Enfermería',     cargo: 'Enfermera Clínica',       calidad: 'Titular',   pagoCuota: 'Al Día',    cuotasPagadas: 12 },
  { id: 7, rut: '19.002.544-2', nombre: 'Felipe Vergara',      estamento: 'TENS',           cargo: 'TENS Móvil Básico',       calidad: 'Reemplazo', pagoCuota: 'Pendiente', cuotasPagadas: 1  },
];

const FINANZAS_DEMO: MovimientoLocal[] = [
  { id: 1, tipo: 'Ingreso', concepto: 'Recaudación Cuotas Mensuales Abril',  monto: 180000, fecha: '2026-04-10' },
  { id: 2, tipo: 'Egreso',  concepto: 'Asesoría Jurídica Ley 19.296',        monto: 75000,  fecha: '2026-04-15' },
  { id: 3, tipo: 'Ingreso', concepto: 'Aporte Voluntario Socios Fundadores', monto: 50000,  fecha: '2026-04-20' },
  { id: 4, tipo: 'Egreso',  concepto: 'Insumos Oficina y Caja Chica',        monto: 22400,  fecha: '2026-04-25' },
  { id: 5, tipo: 'Egreso',  concepto: 'Impresión Estatutos y Credenciales',  monto: 35000,  fecha: '2026-05-02' },
];

const VOTACIONES_DEMO: VotacionLocal[] = [
  { id: 1, titulo: 'Elección de Comisión Revisora de Cuentas', tipo: 'Directiva', estado: 'Activa',
    votosRecibidos: 18, padronTotal: 42,
    opciones: ['Lista A (Unidad y Progreso)', 'Lista B (Renovación SAMU)', 'Blanco/Nulo'],
    votosPorOpcion: [10, 6, 2], votoEmitido: false,
    ministroFe: 'Inspección del Trabajo Talcahuano (Digital)' },
  { id: 2, titulo: 'Aprobación Cuota Extraordinaria - Paseo Fin de Año', tipo: 'Consulta General', estado: 'Finalizada',
    votosRecibidos: 35, padronTotal: 38,
    opciones: ['Aprobar ($10.000)', 'Rechazar'],
    votosPorOpcion: [28, 7], votoEmitido: true,
    ministroFe: 'Autogestionado por Directorio AFUSAMUT' },
];

const BUZON_DEMO: TicketLocal[] = [
  { id: 1, socio: 'Héctor Fuentealba', categoria: 'Seguridad y Salud Laboral',
    mensaje: 'Necesitamos revisar el estado de los amortiguadores de la ambulancia móvil 23.',
    fecha: '2026-05-18', estado: 'Resuelto',
    respuesta: 'Hola Héctor, ya oficializamos el requerimiento al jefe de Logística del Servicio de Salud Talcahuano.' },
  { id: 2, socio: 'Constanza Barra', categoria: 'Consultas Gremiales',
    mensaje: '¿La cuota social inicial se descuenta por planilla automáticamente o debo hacer transferencia directa?',
    fecha: '2026-05-22', estado: 'Pendiente', respuesta: null },
];

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const { rol: authRol, demoMode } = useAuth();

  const [view, setView]               = useState<VistaApp>('landing');
  const [role, setRole]               = useState<RolPortal>('socio');
  const [portalTab, setPortalTab]     = useState('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast]             = useState<ToastData | null>(null);
  const [votingModal, setVotingModal] = useState<VotacionLocal | null>(null);

  // Local state for mutations (demo mode) — Firestore hooks override when configured
  const [sociosLocal,     setSociosLocal]     = useState<SocioLocal[]>(SOCIOS_DEMO);
  const [finanzasLocal,   setFinanzasLocal]   = useState<MovimientoLocal[]>(FINANZAS_DEMO);
  const [votacionesLocal, setVotacionesLocal] = useState<VotacionLocal[]>(VOTACIONES_DEMO);
  const [buzonLocal,      setBuzonLocal]      = useState<TicketLocal[]>(BUZON_DEMO);

  // Firestore real-time data (falls back to demo arrays when not configured)
  const sociosFS     = useFirestoreCol(subscribeSocios,     SOCIOS_DEMO as never[]) as unknown as SocioLocal[];
  const finanzasFS   = useFirestoreCol(subscribeFinanzas,   FINANZAS_DEMO as never[]) as unknown as MovimientoLocal[];
  const votacionesFS = useFirestoreCol(subscribeVotaciones, VOTACIONES_DEMO as never[]) as unknown as VotacionLocal[];
  const buzonFS      = useFirestoreCol(subscribeBuzon,      BUZON_DEMO as never[]) as unknown as TicketLocal[];

  // Use Firestore data in Firebase mode, local state in demo mode
  const socios     = demoMode ? sociosLocal     : sociosFS;
  const finanzas   = demoMode ? finanzasLocal   : finanzasFS;
  const votaciones = demoMode ? votacionesLocal : votacionesFS;
  const buzon      = demoMode ? buzonLocal      : buzonFS;

  // In Firebase mode, role comes from auth; demo mode uses the switcher
  const effectiveRole: RolPortal = demoMode ? role : authRol as RolPortal;

  const triggerToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const goPortal = (tab = 'inicio', r: string = role) => {
    setRole(r as RolPortal);
    setPortalTab(tab);
    setView('portal');
    setMobileMenuOpen(false);
  };

  const handleVotoCastado = (votacionId: number, opcion: string) => {
    setVotacionesLocal(prev => prev.map(v => {
      if (v.id !== votacionId) return v;
      const idx  = v.opciones.indexOf(opcion);
      const next = [...v.votosPorOpcion];
      if (idx !== -1) next[idx]++;
      return { ...v, votosRecibidos: v.votosRecibidos + 1, votosPorOpcion: next, votoEmitido: true };
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Toast toast={toast} />
      {view === 'landing' && (
        <LandingPage
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          goPortal={goPortal}
        />
      )}
      {view === 'portal' && (
        <ProtectedPortal>
          <PortalShell
            role={effectiveRole}   setRole={setRole}
            portalTab={portalTab}  setPortalTab={setPortalTab}
            mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
            setView={(v) => setView(v)}     triggerToast={triggerToast}
            socios={socios}         setSocios={setSociosLocal}
            finanzas={finanzas}     setFinanzas={setFinanzasLocal}
            votaciones={votaciones} setVotaciones={setVotacionesLocal}
            buzon={buzon}           setBuzon={setBuzonLocal}
            onEmitirVoto={v => { setVotingModal(v); }}
            demoMode={demoMode}
          />
        </ProtectedPortal>
      )}
      {votingModal && (
        <VotacionModal
          votacion={votingModal}
          socios={socios}
          onClose={() => setVotingModal(null)}
          onVotoCastado={handleVotoCastado}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
