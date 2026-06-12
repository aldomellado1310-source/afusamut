import React, { useState } from 'react';
import {
  Shield, Users, FileText, Vote, DollarSign, Gift, ArrowRight,
  Menu, X, Check, AlertCircle, Plus, Search, ChevronRight,
  BarChart2, Calendar, Phone, Mail, Award, Lock, Layers,
  CheckCircle2, FileSpreadsheet, Send, MessageSquare, Clock, Printer
} from 'lucide-react';

/* ─── LOGO VECTORIAL AFUSAMUT ─────────────────────────────────────────────── */
const AfusamutLogo = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 500 550" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M250 20 C 380 20,460 60,460 180 C 460 330,360 450,250 520 C 140 450,40 330,40 180 C 40 60,120 20,250 20 Z"
      fill="#0F5132" stroke="#D1A126" strokeWidth="15" strokeLinejoin="round"/>
    <path d="M250 35 C 365 35,440 72,440 180 C 440 315,345 430,250 495 C 155 430,60 315,60 180 C 60 72,135 35,250 35 Z"
      fill="#0A3622" stroke="#F3CD5F" strokeWidth="4"/>
    <path d="M 68 175 C 120 160,380 160,432 175 C 440 140,440 100,430 70 C 370 50,290 45,250 45 C 210 45,130 50,70 70 C 60 100,60 140,68 175 Z"
      fill="#062416"/>
    <text x="250" y="85" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="system-ui,sans-serif" letterSpacing="6">AFUSAMUT</text>
    <text x="250" y="132" textAnchor="middle" fill="#F3CD5F" fontSize="46" fontWeight="900" fontFamily="system-ui,sans-serif" letterSpacing="4">SAMU</text>
    <text x="250" y="158" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="5">TALCAHUANO</text>
    <path d="M 61 178 C 150 160,350 160,439 178 L 440 260 C 350 240,150 240,60 260 Z" fill="#FFFDF4"/>
    <g transform="translate(250,285) scale(1.15)">
      <path d="M-15,-75 L15,-75 L20,-30 L65,-55 L80,-30 L35,-5 L75,25 L55,50 L15,20 L15,70 L-15,70 L-15,20 L-55,50 L-75,25 L-35,-5 L-80,-30 L-65,-55 L-20,-30 Z"
        fill="#0D6EFD" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="miter"/>
      <path d="M0,-55 L0,55" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round"/>
      <path d="M -12,35 C -25,20 0,10 0,-5 C 0,-20 -20,-25 -5,-40 C 5,-50 15,-30 1,-20 C -10,-10 12,5 5,20 C 0,30 -5,30 -10,35"
        stroke="#FFFDF4" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <g transform="translate(105,330) rotate(-15) scale(0.8)">
      <path d="M0,120 Q-20,60 0,0" stroke="#F3CD5F" strokeWidth="4" fill="none"/>
      {[10,30,50,70,90].map(y => (
        <React.Fragment key={y}>
          <path d={`M0,${y} Q-18,${y-10} -8,${y-20} Q2,${y-20} 0,${y}`} fill="#F3CD5F"/>
          <path d={`M0,${y} Q18,${y-10} 8,${y-20} Q-2,${y-20} 0,${y}`} fill="#F3CD5F"/>
        </React.Fragment>
      ))}
    </g>
    <g transform="translate(395,330) rotate(15) scale(0.8) translate(-10,0)">
      <path d="M0,120 Q20,60 0,0" stroke="#F3CD5F" strokeWidth="4" fill="none"/>
      {[10,30,50,70,90].map(y => (
        <React.Fragment key={y}>
          <path d={`M0,${y} Q18,${y-10} 8,${y-20} Q-2,${y-20} 0,${y}`} fill="#F3CD5F"/>
          <path d={`M0,${y} Q-18,${y-10} -8,${y-20} Q2,${y-20} 0,${y}`} fill="#F3CD5F"/>
        </React.Fragment>
      ))}
    </g>
    <g transform="translate(160,420) scale(1.1)">
      <path d="M10,45 L-10,25 L-2,15 L18,35 Z" fill="#FFFFFF"/>
      <path d="M5,50 L-15,30 L-8,22 L12,42 Z" fill="#0A3622"/>
      <path d="M150,45 L170,25 L162,15 L142,35 Z" fill="#FFFFFF"/>
      <path d="M155,50 L175,30 L168,22 L148,42 Z" fill="#0A3622"/>
      <path d="M2,21 C15,15 35,5 50,15 C55,18 52,25 45,28 C35,32 15,32 2,21 Z" fill="#ECA17B"/>
      <path d="M158,21 C145,15 125,5 110,15 C105,18 108,25 115,28 C125,32 145,32 158,21 Z" fill="#ECA17B"/>
      <path d="M45,22 C55,10 105,10 115,22 C118,25 115,38 105,42 C95,45 65,45 55,42 C45,38 42,25 45,22 Z" fill="#D78A63"/>
      <path d="M60,18 C70,12 90,12 100,18" stroke="#AE603B" strokeWidth="3" strokeLinecap="round"/>
      <path d="M72,22 C75,25 75,32 72,35 M78,21 C81,24 81,31 78,34 M84,21 C87,24 87,31 84,34 M90,22 C93,25 93,32 90,35"
        stroke="#AE603B" strokeWidth="3" strokeLinecap="round"/>
    </g>
  </svg>
);

/* ─── DATOS ESTATUTOS ─────────────────────────────────────────────────────── */
const estatutosCapitulos = [
  {
    titulo: "TÍTULO I — DENOMINACIÓN, DOMICILIO, DURACIÓN Y MARCO NORMATIVO",
    articulos: [
      { num: 1, desc: "Denominación", texto: "Créase la Asociación de Funcionarios SAMU Talcahuano, que podrá usar indistintamente la sigla AFUSAMUT." },
      { num: 2, desc: "Naturaleza y base institucional", texto: "La Asociación se constituye en el marco de la Ley N° 19.296 y se organiza en la esfera del Servicio de Salud Talcahuano, particularmente en el dispositivo SAMU, sin fines de lucro." },
      { num: 3, desc: "Domicilio", texto: "El domicilio de la Asociación será la comuna de Talcahuano, sin perjuicio de desarrollar actividades en las comunas y bases operativas que integren el SAMU del Servicio de Salud Talcahuano." },
      { num: 4, desc: "Duración", texto: "La Asociación tendrá duración indefinida, mientras no se disuelva conforme a la ley y a estos Estatutos." },
      { num: 5, desc: "Marco normativo", texto: "La Asociación se regirá por la Ley N° 19.296, por los dictámenes y criterios interpretativos de la Dirección del Trabajo, y por el presente Estatuto." },
    ],
  },
  {
    titulo: "TÍTULO II — PRINCIPIOS Y FINALIDADES",
    articulos: [
      { num: 6, desc: "Principios rectores", texto: "La Asociación orientará su actuación por los principios de: democracia interna, participación, transparencia, probidad, no discriminación, respeto interprofesional, protección de derechos laborales, seguridad del trabajador sanitario, salud mental laboral y fortalecimiento del sistema prehospitalario." },
      { num: 7, desc: "Finalidad general", texto: "Representar, promover y defender los intereses laborales, profesionales, de seguridad y bienestar de sus afiliados/as, y contribuir al fortalecimiento del SAMU como dispositivo crítico de salud pública." },
      { num: 8, desc: "Finalidades específicas", texto: "Son finalidades de la Asociación: representar a afiliados ante autoridades del Servicio de Salud, velar por condiciones dignas y seguras de trabajo, promover capacitación, y celebrar convenios de salud y bienestar." },
    ],
  },
  {
    titulo: "TÍTULO III — DE LOS SOCIOS",
    articulos: [
      { num: 9, desc: "Afiliación", texto: "Podrán afiliarse los funcionarios/as que presten servicios en el SAMU del Servicio de Salud Talcahuano. Se entenderá por funcionarios a quienes se desempeñen en calidad de titularidad y contrata para la conformación, pudiendo incorporarse posteriormente reemplazos." },
      { num: 10, desc: "Derechos de los socios", texto: "Son derechos mínimos: participar con derecho a voz y voto en asambleas; elegir y ser elegido para cargos; solicitar apoyo gremial y representación; acceder a información financiera y actas de la organización." },
      { num: 11, desc: "Deberes de los socios", texto: "Respetar estos Estatutos y acuerdos válidos; mantener conducta compatible con los fines de la Asociación; pagar oportunamente las cuotas; cuidar el patrimonio institucional." },
      { num: 12, desc: "Pérdida de calidad de socio", texto: "Se pierde por: renuncia escrita, dejar de pertenecer al ámbito institucional (SAMU Talcahuano), o expulsión fundada ratificada por la Asamblea General conforme al debido proceso." },
    ],
  },
  {
    titulo: "TÍTULO IV — DE LAS ASAMBLEAS",
    articulos: [
      { num: 13, desc: "Órgano superior", texto: "La Asamblea General constituye el órgano resolutivo superior de la Asociación. Sus sesiones podrán celebrarse de manera presencial o telemática, debiendo quedar grabadas." },
      { num: 14, desc: "Tipos de asamblea", texto: "Habrá Asambleas Ordinarias (al menos una vez al año) y Extraordinarias convocadas por el Directorio." },
      { num: 16, desc: "Quórum y acuerdos", texto: "En primera citación: mayoría absoluta de socios. En segunda citación: con socios presentes. Los acuerdos se adoptan por mayoría simple de los presentes." },
    ],
  },
  {
    titulo: "TÍTULO V — DEL DIRECTORIO",
    articulos: [
      { num: 18, desc: "Dirección", texto: "La Asociación será dirigida por un Directorio ajustado al artículo 17 de la Ley N° 19.296. Durará dos (2) años en sus funciones." },
      { num: 19, desc: "Integración funcional", texto: "La Asociación procurará una integración representativa de los estamentos: Enfermería, TENS, Conductores y Administrativos." },
      { num: 23, desc: "Presidente", texto: "Representar judicial y extrajudicialmente a la Asociación, convocar y presidir asambleas, supervisar el funcionamiento de las áreas." },
      { num: 24, desc: "Secretario", texto: "Llevar el registro actualizado de afiliados, redactar y custodiar actas, coordinar procesos eleccionarios." },
      { num: 25, desc: "Tesorero", texto: "Administrar recursos financieros, llevar la contabilidad, efectuar rendiciones de cuenta semestrales." },
    ],
  },
  {
    titulo: "TÍTULO VI — PATRIMONIO Y FINANZAS",
    articulos: [
      { num: 26, desc: "Administración y transparencia", texto: "El Directorio administrará los fondos mediante cuenta bancaria única. Se presentará informe financiero semestral y se constituirá una Comisión Revisora de Cuentas elegida por Asamblea." },
      { num: 28, desc: "Cuota ordinaria", texto: "La cuota ordinaria mensual inicial será de $4.000 CLP (cuatro mil pesos), reajustada automáticamente cada dos años según IPC acumulado. Descuento aplicable por planilla o transferencia." },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── Navegación ── */
  const [view, setView]               = useState('landing');
  const [role, setRole]               = useState('socio');
  const [portalTab, setPortalTab]     = useState('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast]             = useState(null);

  /* ── Datos reactivos ── */
  const [socios, setSocios] = useState([
    { id:1, rut:"15.421.902-3", nombre:"Alejandro Sanhueza",  estamento:"Enfermería",    cargo:"Reanimador SAMU",        calidad:"Titular",   pagoCuota:"Al Día",   cuotasPagadas:12 },
    { id:2, rut:"17.112.554-K", nombre:"Valeska Cid",         estamento:"TENS",          cargo:"TENS Reguladora",        calidad:"Contrata",  pagoCuota:"Al Día",   cuotasPagadas:12 },
    { id:3, rut:"12.890.432-1", nombre:"Héctor Fuentealba",   estamento:"Conductores",   cargo:"Conductor de Emergencia",calidad:"Titular",   pagoCuota:"Al Día",   cuotasPagadas:11 },
    { id:4, rut:"18.345.112-9", nombre:"Constanza Barra",     estamento:"Administrativo",cargo:"Apoyo Logístico",        calidad:"Contrata",  pagoCuota:"Pendiente",cuotasPagadas:9  },
    { id:5, rut:"16.712.901-5", nombre:"Rodrigo Toledo",      estamento:"Conductores",   cargo:"Conductor Avanzado",     calidad:"Reemplazo", pagoCuota:"Al Día",   cuotasPagadas:3  },
    { id:6, rut:"14.908.332-6", nombre:"Claudia Orellana",    estamento:"Enfermería",    cargo:"Enfermera Clínica",      calidad:"Titular",   pagoCuota:"Al Día",   cuotasPagadas:12 },
    { id:7, rut:"19.002.544-2", nombre:"Felipe Vergara",      estamento:"TENS",          cargo:"TENS Móvil Básico",      calidad:"Reemplazo", pagoCuota:"Pendiente",cuotasPagadas:1  },
  ]);

  const [finanzas, setFinanzas] = useState([
    { id:1, tipo:"Ingreso", concepto:"Recaudación Cuotas Mensuales Abril",    monto:180000, fecha:"2026-04-10" },
    { id:2, tipo:"Egreso",  concepto:"Asesoría Jurídica Ley 19.296",          monto:75000,  fecha:"2026-04-15" },
    { id:3, tipo:"Ingreso", concepto:"Aporte Voluntario Socios Fundadores",   monto:50000,  fecha:"2026-04-20" },
    { id:4, tipo:"Egreso",  concepto:"Insumos Oficina y Caja Chica",          monto:22400,  fecha:"2026-04-25" },
    { id:5, tipo:"Egreso",  concepto:"Impresión Estatutos y Credenciales",    monto:35000,  fecha:"2026-05-02" },
  ]);

  const [votaciones, setVotaciones] = useState([
    { id:1, titulo:"Elección de Comisión Revisora de Cuentas", tipo:"Directiva", estado:"Activa",
      votosRecibidos:18, padronTotal:42,
      opciones:["Lista A (Unidad y Progreso)","Lista B (Renovación SAMU)","Blanco/Nulo"],
      votosPorOpcion:[10,6,2], votoEmitido:false,
      ministroFe:"Inspección del Trabajo Talcahuano (Digital)" },
    { id:2, titulo:"Aprobación Cuota Extraordinaria - Paseo Fin de Año", tipo:"Consulta General", estado:"Finalizada",
      votosRecibidos:35, padronTotal:38,
      opciones:["Aprobar ($10.000)","Rechazar"],
      votosPorOpcion:[28,7], votoEmitido:true,
      ministroFe:"Autogestionado por Directorio AFUSAMUT" },
  ]);

  const [buzon, setBuzon] = useState([
    { id:1, socio:"Héctor Fuentealba", categoria:"Seguridad y Salud Laboral",
      mensaje:"Necesitamos revisar el estado de los amortiguadores de la ambulancia móvil 23, está golpeando muy fuerte en zonas rurales.",
      fecha:"2026-05-18", estado:"Resuelto",
      respuesta:"Hola Héctor, ya oficializamos el requerimiento al jefe de Logística del Servicio de Salud Talcahuano." },
    { id:2, socio:"Constanza Barra", categoria:"Consultas Gremiales",
      mensaje:"¿La cuota social inicial se descuenta por planilla automáticamente o debo hacer transferencia directa?",
      fecha:"2026-05-22", estado:"Pendiente", respuesta:null },
  ]);

  /* ── Formularios ── */
  const [newSocio,    setNewSocio]    = useState({ rut:'', nombre:'', estamento:'Enfermería', cargo:'', calidad:'Titular' });
  const [newTrans,    setNewTrans]    = useState({ tipo:'Egreso', concepto:'', monto:'' });
  const [newBuzonMsg, setNewBuzonMsg] = useState({ categoria:'Consultas Gremiales', mensaje:'' });
  const [newVote,     setNewVote]     = useState({ titulo:'', opciones:'', ministroFe:'Autogestionado por Directorio' });

  /* ── Búsqueda/filtros separados por módulo ── */
  const [socioSearch, setSocioSearch]           = useState('');
  const [socioEstamento, setSocioEstamento]     = useState('Todos');
  const [estatutoSearch, setEstatutoSearch]     = useState('');

  /* ── Modal votación ── */
  const [votingModal, setVotingModal]   = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [securityRut, setSecurityRut]   = useState('');
  const [replyTexts, setReplyTexts]     = useState({});

  /* ── Utilidades ── */
  const triggerToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const goPortal = (tab = 'inicio', r = role) => {
    setRole(r);
    setPortalTab(tab);
    setView('portal');
    setMobileMenuOpen(false);
  };

  /* ── Handlers ── */
  const handleAddSocio = (e) => {
    e.preventDefault();
    if (!newSocio.rut || !newSocio.nombre || !newSocio.cargo) return triggerToast("Complete todos los campos requeridos.", "error");
    setSocios(prev => [{ id: prev.length + 1, ...newSocio, pagoCuota:"Al Día", cuotasPagadas:0 }, ...prev]);
    setNewSocio({ rut:'', nombre:'', estamento:'Enfermería', cargo:'', calidad:'Titular' });
    triggerToast("Socio incorporado al padrón oficial.");
  };

  const handleAddTrans = (e) => {
    e.preventDefault();
    if (!newTrans.concepto || !newTrans.monto) return triggerToast("Complete concepto y monto.", "error");
    setFinanzas(prev => [{ id: prev.length + 1, tipo: newTrans.tipo, concepto: newTrans.concepto, monto: parseInt(newTrans.monto), fecha: new Date().toISOString().split('T')[0] }, ...prev]);
    setNewTrans({ tipo:'Egreso', concepto:'', monto:'' });
    triggerToast("Transacción registrada en caja.");
  };

  const handleAddBuzon = (e) => {
    e.preventDefault();
    if (!newBuzonMsg.mensaje) return triggerToast("El mensaje no puede estar vacío.", "error");
    setBuzon(prev => [{ id: prev.length + 1, socio: role === 'admin' ? 'Directorio AFUSAMUT' : 'Socio Autenticado', ...newBuzonMsg, fecha: new Date().toISOString().split('T')[0], respuesta: null, estado:"Pendiente" }, ...prev]);
    setNewBuzonMsg({ categoria:'Consultas Gremiales', mensaje:'' });
    triggerToast("Consulta enviada al Directorio de forma segura.");
  };

  const handleAddVote = (e) => {
    e.preventDefault();
    if (!newVote.titulo || !newVote.opciones) return triggerToast("Rellene título y opciones.", "error");
    const opts = newVote.opciones.split(',').map(o => o.trim()).filter(Boolean);
    setVotaciones(prev => [{
      id: prev.length + 1, titulo: newVote.titulo, tipo:"Asamblea Extraordinaria", estado:"Activa",
      votosRecibidos:0, padronTotal: socios.length,
      opciones:[...opts,"Blanco / Nulo"], votosPorOpcion: Array(opts.length + 1).fill(0),
      votoEmitido: false, ministroFe: newVote.ministroFe
    }, ...prev]);
    setNewVote({ titulo:'', opciones:'', ministroFe:'Autogestionado por Directorio' });
    triggerToast("Votación digital iniciada.");
  };

  const handleCastVote = (e) => {
    e.preventDefault();
    if (!selectedOption || !securityRut) return triggerToast("Ingrese su RUT y seleccione una opción.", "error");
    const socioOk = socios.find(s => s.rut.replace(/\s/g,'').toLowerCase() === securityRut.replace(/\s/g,'').toLowerCase());
    if (!socioOk) return triggerToast("RUT no registrado en el padrón de AFUSAMUT.", "error");
    setVotaciones(prev => prev.map(v => {
      if (v.id !== votingModal.id) return v;
      const idx = v.opciones.indexOf(selectedOption);
      const next = [...v.votosPorOpcion];
      if (idx !== -1) next[idx]++;
      return { ...v, votosRecibidos: v.votosRecibidos + 1, votosPorOpcion: next, votoEmitido: true };
    }));
    setVotingModal(null); setSelectedOption(''); setSecurityRut('');
    triggerToast("Sufragio emitido de forma secreta e irreversible.");
  };

  const toggleSocioPago = (id) => {
    setSocios(prev => prev.map(s => {
      if (s.id !== id) return s;
      const al = s.pagoCuota !== "Al Día";
      return { ...s, pagoCuota: al ? "Al Día" : "Pendiente", cuotasPagadas: al ? s.cuotasPagadas + 1 : Math.max(0, s.cuotasPagadas - 1) };
    }));
    triggerToast("Estado de cuota actualizado.");
  };

  const handleAnswerTicket = (id) => {
    const txt = replyTexts[id] || '';
    if (!txt.trim()) return triggerToast("Escriba una respuesta antes de enviar.", "error");
    setBuzon(prev => prev.map(b => b.id === id ? { ...b, respuesta: txt, estado:"Resuelto" } : b));
    setReplyTexts(prev => { const n = {...prev}; delete n[id]; return n; });
    triggerToast("Respuesta enviada al socio.");
  };

  /* ── Cálculos financieros ── */
  const totalIngresos = finanzas.filter(f => f.tipo === "Ingreso").reduce((a, c) => a + c.monto, 0);
  const totalEgresos  = finanzas.filter(f => f.tipo === "Egreso").reduce((a, c) => a + c.monto, 0);
  const cajaDisponible = totalIngresos - totalEgresos;

  /* ── Socios filtrados ── */
  const sociosFiltrados = socios.filter(s => {
    const ok1 = s.nombre.toLowerCase().includes(socioSearch.toLowerCase()) || s.rut.includes(socioSearch);
    const ok2 = socioEstamento === "Todos" || s.estamento === socioEstamento;
    return ok1 && ok2;
  });

  /* ═══════════════════ COMPONENTES INTERNOS REUTILIZABLES ════════════════ */

  const StatCard = ({ label, value, sub, color = "text-slate-900" }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide mb-1">{label}</span>
      <span className={`text-2xl font-extrabold ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-slate-400 block mt-0.5">{sub}</span>}
    </div>
  );

  const NavBtn = ({ tab, icon: Icon, label }) => (
    <button onClick={() => setPortalTab(tab)}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
        portalTab === tab ? 'bg-amber-500 text-emerald-950 shadow-sm' : 'hover:bg-emerald-900/60 text-emerald-100'
      }`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </button>
  );

  const SectionHeader = ({ title, sub }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
          {role === 'admin' ? 'D' : 'S'}
        </div>
        <div>
          <span className="block text-[11px] font-bold text-slate-900">{role === 'admin' ? 'Directorio AFUSAMUT' : 'Socio/a Autenticado'}</span>
          <span className="text-[9px] text-slate-400">{role === 'admin' ? 'directiva@afusamut.cl' : 'Base Operativa Talcahuano'}</span>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════ RENDER ════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 text-sm font-semibold max-w-sm ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-900 text-emerald-50 border border-emerald-700'
        }`}>
          {toast.type === 'error'
            ? <AlertCircle className="w-5 h-5 shrink-0" />
            : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          LANDING PAGE
      ════════════════════════════════════════════════════════════════════ */}
      {view === 'landing' && (
        <>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-xl border-b border-emerald-800/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
              <button onClick={() => setView('landing')} className="flex items-center gap-3">
                <AfusamutLogo className="w-12 h-12" />
                <div className="text-left">
                  <h1 className="font-black text-lg tracking-tight leading-none">AFUSAMUT</h1>
                  <span className="text-[10px] text-emerald-300 font-bold tracking-widest uppercase">SAMU Talcahuano</span>
                </div>
              </button>
              <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-emerald-100">
                <span className="hover:text-white cursor-pointer transition">Inicio</span>
                <span onClick={() => goPortal('estatutos')} className="hover:text-white cursor-pointer transition">Estatutos</span>
                <span onClick={() => goPortal('beneficios')} className="hover:text-white cursor-pointer transition">Convenios</span>
              </nav>
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => goPortal('inicio','socio')}
                  className="px-4 py-2 text-sm font-bold border border-emerald-600 text-emerald-300 hover:bg-emerald-900/40 rounded-lg transition">
                  Portal Socio/a
                </button>
                <button onClick={() => goPortal('inicio','admin')}
                  className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-lg shadow flex items-center gap-1.5 transition">
                  <Lock className="w-4 h-4" /> Directorio
                </button>
              </div>
              <button className="md:hidden p-2 text-emerald-200 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            {mobileMenuOpen && (
              <div className="md:hidden bg-emerald-900 border-t border-emerald-800 px-4 py-5 space-y-4">
                <span onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-emerald-100">Inicio</span>
                <span onClick={() => goPortal('estatutos')} className="block font-semibold text-emerald-100 cursor-pointer">Estatutos</span>
                <span onClick={() => goPortal('beneficios')} className="block font-semibold text-emerald-100 cursor-pointer">Convenios</span>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={() => goPortal('inicio','socio')} className="py-2 text-sm font-bold border border-emerald-700 text-emerald-300 rounded-lg">Portal Socio</button>
                  <button onClick={() => goPortal('inicio','admin')} className="py-2 text-sm font-bold bg-amber-500 text-emerald-950 rounded-lg flex items-center justify-center gap-1"><Lock className="w-4 h-4"/>Directorio</button>
                </div>
              </div>
            )}
          </header>

          {/* Hero */}
          <section className="relative bg-emerald-950 text-white py-16 lg:py-24 overflow-hidden">
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize:'30px 30px' }} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900 border border-emerald-700 text-amber-400">
                  <Shield className="w-3.5 h-3.5" /> Constituida bajo la Ley N° 19.296
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none">
                  Unidos por la Salud Prehospitalaria de <span className="text-amber-400">Talcahuano</span>
                </h1>
                <p className="text-lg text-emerald-100 max-w-2xl leading-relaxed">
                  Portal oficial de AFUSAMUT — representamos, defendemos y promovemos la seguridad laboral, transparencia y salud mental del equipo de emergencia SAMU.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2 max-w-sm mx-auto lg:mx-0">
                  {[['09 Abr','Constitución 2026'],['100%','Prehospitalario'],['Ley','19.296']].map(([v,l]) => (
                    <div key={l} className="bg-emerald-900/60 border border-emerald-800 p-3 rounded-xl text-center">
                      <span className="block text-xl font-black text-amber-400">{v}</span>
                      <span className="text-[10px] text-emerald-300">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-4">
                  <button onClick={() => goPortal('inicio','socio')}
                    className="w-full sm:w-auto px-8 py-4 font-bold bg-amber-500 text-emerald-950 rounded-xl shadow-lg hover:bg-amber-400 transition flex items-center justify-center gap-2">
                    Ingresar al Portal Gremial <ArrowRight className="w-5 h-5" />
                  </button>
                  <button onClick={() => goPortal('estatutos')}
                    className="w-full sm:w-auto px-8 py-4 font-bold border border-emerald-700 text-white rounded-xl hover:bg-emerald-900/40 transition">
                    Ver Estatutos
                  </button>
                </div>
              </div>
              <div className="lg:col-span-5 flex justify-center">
                <div className="p-6 bg-emerald-900/40 border border-emerald-800 rounded-3xl backdrop-blur shadow-2xl flex flex-col items-center max-w-xs w-full">
                  <AfusamutLogo className="w-56 h-56" />
                  <p className="text-sm font-bold text-amber-400 uppercase tracking-widest mt-4">AFUSAMUT</p>
                  <p className="text-xs text-emerald-300 mt-1">Servicio de Salud Talcahuano</p>
                </div>
              </div>
            </div>
          </section>

          {/* Principios */}
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl font-black text-slate-900">Principios Rectores de la Gremial</h2>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed">Protección laboral, salud mental y democracia activa para cada funcionario del SAMU.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: Shield, color:'bg-emerald-100 text-emerald-800', title:'Seguridad del Trabajador Sanitario', text:'Velamos por condiciones dignas y seguras en ruta, bases y despachos, reduciendo el riesgo psicosocial e institucional.' },
                  { icon: Vote,   color:'bg-amber-100 text-amber-800',    title:'Democracia e Inalterabilidad',      text:'Soberanía asambleísta respaldada por mecanismos de votación transparente, secreta y conforme a la Dirección del Trabajo.' },
                  { icon: FileText,color:'bg-blue-100 text-blue-800',     title:'Transparencia Total de Fondos',     text:'Rendiciones semestrales automatizadas y acceso directo para que cada socio verifique la inversión de sus cuotas.' },
                ].map(({ icon: Icon, color, title, text }) => (
                  <div key={title} className="bg-slate-50 p-7 rounded-2xl border border-slate-100 hover:shadow-md transition">
                    <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-5`}><Icon className="w-5 h-5"/></div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Extracto Estatutos */}
          <section className="py-16 bg-slate-50 border-y border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 space-y-5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Bases Estatutarias</span>
                <h2 className="text-3xl font-black text-slate-900">Nuestros Estatutos en síntesis</h2>
                <div className="space-y-3 text-sm">
                  {[
                    ['Directorio de 2 años','Representatividad equitativa de todos los estamentos del SAMU.'],
                    ['Cuota $4.000 CLP','Reajustable según IPC acumulado cada dos años.'],
                    ['Asamblea Telemática','Válida jurídicamente con grabación y actas digitales.'],
                  ].map(([t,d]) => (
                    <div key={t} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"/>
                      <div><strong>{t}:</strong> {d}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => goPortal('estatutos')}
                  className="px-6 py-3 font-bold bg-emerald-950 text-white hover:bg-emerald-900 rounded-xl flex items-center gap-2 text-sm shadow">
                  <FileText className="w-4 h-4"/> Leer Estatutos Completos
                </button>
              </div>
              <div className="lg:col-span-7 bg-white p-7 rounded-3xl shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-4 border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">Extracto: Derechos de los Socios (Art. 10)</h3>
                  <span className="text-xs text-amber-600 font-bold">AFUSAMUT</span>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['Participación Plena','Derecho a voz y voto en todas las asambleas ordinarias y extraordinarias, físicas o telemáticas.'],
                    ['Elección Representativa','Elegir y ser elegido con antigüedad mínima de 6 meses de afiliación.'],
                    ['Transparencia Financiera','Acceder a información financiera y actas custodiadas por Secretario y Tesorero.'],
                  ].map(([t,d]) => (
                    <div key={t} className="bg-slate-50 p-4 rounded-xl border-l-4 border-emerald-600">
                      <span className="block font-bold mb-1 text-emerald-800 text-xs uppercase tracking-wide">{t}</span>
                      <span className="text-slate-600 text-xs">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Directiva */}
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-slate-900">Representantes Gremiales</h2>
                <p className="text-slate-500 text-sm mt-2">Directorio provisorio y fundacional de AFUSAMUT.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  { letra:'P', cargo:'Presidente / Presidenta', badge:'bg-amber-100 text-amber-800', desc:'Representación legal judicial y extrajudicial. Convocatoria y dirección de asambleas.' },
                  { letra:'S', cargo:'Secretario / Secretaria', badge:'bg-emerald-100 text-emerald-800', desc:'Control del Padrón de Socios, redacción de actas y coordinación de procesos eleccionarios.' },
                  { letra:'T', cargo:'Tesorero / Tesorera',     badge:'bg-emerald-100 text-emerald-800', desc:'Administración contable, resguardo del patrimonio y rendición financiera semestral.' },
                ].map(({ letra, cargo, badge, desc }) => (
                  <div key={cargo} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3 hover:shadow-md transition">
                    <div className="w-16 h-16 bg-emerald-950 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl font-black">{letra}</div>
                    <div>
                      <h4 className="font-bold text-slate-900">{cargo}</h4>
                      <span className={`text-[10px] ${badge} px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block`}>AFUSAMUT</span>
                    </div>
                    <p className="text-slate-500 text-xs">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-emerald-950 text-white py-12 border-t border-emerald-900 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AfusamutLogo className="w-9 h-9"/>
                  <span className="font-black text-lg">AFUSAMUT</span>
                </div>
                <p className="text-xs text-emerald-300 leading-relaxed">Asociación de Funcionarios SAMU Talcahuano. Región del Biobío, Chile.</p>
              </div>
              <div className="text-xs text-emerald-200 space-y-2">
                <h5 className="font-bold text-sm text-white mb-2">Acceso Rápido</h5>
                <p className="cursor-pointer hover:text-white" onClick={() => goPortal('estatutos')}>Estatutos Oficiales</p>
                <p className="cursor-pointer hover:text-white" onClick={() => goPortal('beneficios')}>Convenios y Alianzas</p>
                <p className="cursor-pointer hover:text-white" onClick={() => goPortal('inicio','admin')}>Acceso Directorio</p>
              </div>
              <div className="text-xs text-emerald-200 space-y-2">
                <h5 className="font-bold text-sm text-white mb-2">Información Gremial</h5>
                <p><strong>Domicilio:</strong> Comuna de Talcahuano, Biobío.</p>
                <p><strong>Marco Legal:</strong> Ley N° 19.296.</p>
                <p className="text-amber-400 font-bold">directiva@afusamut.cl</p>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-emerald-900 text-center text-xs text-emerald-400">
              © {new Date().getFullYear()} AFUSAMUT Talcahuano — Desarrollado bajo estándares de la Dirección del Trabajo de Chile.
            </div>
          </footer>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          PORTAL
      ════════════════════════════════════════════════════════════════════ */}
      {view === 'portal' && (
        <div className="flex flex-1 min-h-screen">

          {/* Sidebar */}
          <aside className="w-64 shrink-0 bg-emerald-950 text-emerald-100 flex flex-col border-r border-emerald-900 hidden md:flex">
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
              <button onClick={() => setView('landing')} className="text-[10px] text-emerald-300 hover:text-white bg-emerald-950/60 px-2 py-1 rounded-lg">Salir</button>
            </div>

            {/* Switcher de rol */}
            <div className="px-3 py-3 border-b border-emerald-800/60">
              <span className="text-[9px] text-emerald-400 uppercase font-bold block mb-1.5 tracking-widest">Simular rol:</span>
              <div className="grid grid-cols-2 gap-1 bg-emerald-950 p-1 rounded-lg border border-emerald-800">
                <button onClick={() => { setRole('socio'); triggerToast("Vista: Socio/a"); }}
                  className={`py-1 text-xs font-bold rounded transition ${role === 'socio' ? 'bg-amber-500 text-emerald-950' : 'text-emerald-300 hover:text-white'}`}>
                  Socio/a
                </button>
                <button onClick={() => { setRole('admin'); triggerToast("Vista: Directorio"); }}
                  className={`py-1 text-xs font-bold rounded transition ${role === 'admin' ? 'bg-amber-500 text-emerald-950' : 'text-emerald-300 hover:text-white'}`}>
                  Directorio
                </button>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <NavBtn tab="inicio"     icon={Layers}        label="Inicio & Avisos"         />
              <NavBtn tab="socios"     icon={Users}         label="Padrón de Socios"        />
              <NavBtn tab="finanzas"   icon={DollarSign}    label="Finanzas y Caja"         />
              <NavBtn tab="votaciones" icon={Vote}          label="Votaciones y Actas"      />
              <NavBtn tab="beneficios" icon={Gift}          label="Club de Beneficios"      />
              <NavBtn tab="estatutos"  icon={FileText}      label="Estatutos Oficiales"     />
              <NavBtn tab="buzon"      icon={MessageSquare} label="Buzón Gremial"           />
            </nav>

            <div className="p-4 border-t border-emerald-900 text-[10px] text-emerald-400">
              <p className="font-bold text-emerald-200">AFUSAMUT Talcahuano</p>
              <p>Ley 19.296 · Biobío · Chile</p>
            </div>
          </aside>

          {/* Mobile Top Nav */}
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
              {[['inicio','Inicio'],['socios','Socios'],['finanzas','Finanzas'],['votaciones','Votaciones'],['beneficios','Beneficios'],['estatutos','Estatutos'],['buzon','Buzón']].map(([t,l]) => (
                <button key={t} onClick={() => { setPortalTab(t); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${portalTab === t ? 'bg-amber-500 text-emerald-950' : 'text-emerald-100 hover:bg-emerald-900'}`}>
                  {l}
                </button>
              ))}
              <button onClick={() => { setView('landing'); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-300 font-semibold">← Salir del Portal</button>
            </div>
          )}

          {/* Contenido principal */}
          <main className="flex-1 bg-slate-50 p-4 sm:p-8 overflow-y-auto md:min-h-0 mt-12 md:mt-0">

            {/* ── INICIO ── */}
            {portalTab === 'inicio' && (
              <div className="space-y-6">
                <SectionHeader title="Inicio y Comunicados" sub="Últimos avisos, circulares y contingencia SAMU." />
                <div className="p-6 bg-gradient-to-r from-emerald-900 to-emerald-950 rounded-2xl text-white shadow-lg">
                  <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">Urgente</span>
                  <h2 className="text-xl font-black mt-2">¡Asociación Constituida con Éxito!</h2>
                  <p className="text-xs text-emerald-200 mt-2 leading-relaxed max-w-xl">
                    El 9 de abril de 2026 formalizamos AFUSAMUT en la Inspección del Trabajo. Estamos iniciando el registro masivo del padrón. ¡Invita a tus compañeros de base!
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Caja Disponible"     value={`$${cajaDisponible.toLocaleString('es-CL')}`} sub="Saldo neto gremial" color="text-emerald-700"/>
                  <StatCard label="Socios Registrados"  value={socios.length}                                sub="Titulares, contratas, reemplazos"/>
                  <StatCard label="Votaciones Activas"  value={votaciones.filter(v=>v.estado==='Activa').length} sub="Disponibles para sufragar" color="text-amber-600"/>
                  <StatCard label="Soporte Pendiente"   value={buzon.filter(b=>b.estado==='Pendiente').length}  sub="Requerimientos por responder"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-emerald-700"/>Comunicaciones Oficiales del Directorio</h3>
                    {[
                      { badge:'bg-emerald-100 text-emerald-800', tipo:'Comunicado General', fecha:'15 Abr 2026', titulo:'Inicio del Proceso de Descuento de Cuotas por Planilla',
                        texto:'Se entregó al área de remuneraciones del Servicio de Salud Talcahuano la nómina de socios titulares y contratas para iniciar el descuento automático de $4.000 mensuales. Los reemplazantes deben coordinar con tesorería.' },
                      { badge:'bg-amber-100 text-amber-800', tipo:'Capacitación', fecha:'10 Abr 2026', titulo:'Convenio de Formación en Trauma Prehospitalario Avanzado',
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
                        <div><span className="font-bold block">{h.titulo}</span><span className="text-slate-500">{h.sub}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SOCIOS ── */}
            {portalTab === 'socios' && (
              <div className="space-y-6">
                <SectionHeader title="Gestión y Padrón de Socios" sub="Nómina oficial de afiliados de todas las bases de Talcahuano." />
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/>
                    <input type="text" placeholder="Buscar por nombre o RUT…" value={socioSearch}
                      onChange={e => setSocioSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                  </div>
                  <select value={socioEstamento} onChange={e => setSocioEstamento(e.target.value)}
                    className="border rounded-lg text-sm px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-700">
                    {['Todos','Enfermería','TENS','Conductores','Administrativo'].map(e => <option key={e}>{e}</option>)}
                  </select>
                  <span className="text-xs text-slate-500 font-bold ml-auto shrink-0">{sociosFiltrados.length} socio{sociosFiltrados.length !== 1 ? 's' : ''} filtrados</span>
                </div>

                <div className={`grid grid-cols-1 ${role === 'admin' ? 'lg:grid-cols-12' : ''} gap-6`}>
                  {role === 'admin' && (
                    <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
                      <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-700"/>Inscribir Socio en Padrón</h3>
                      <form onSubmit={handleAddSocio} className="space-y-3 text-xs">
                        {[['RUT *','text','Ej: 12.345.678-9','rut'],['Nombre Completo *','text','Ej: Juan Pérez Muñoz','nombre'],['Cargo Específico *','text','Ej: Reanimador / Conductor Móvil','cargo']].map(([label,type,ph,key]) => (
                          <div key={key}>
                            <label className="block text-slate-600 font-bold mb-1">{label}</label>
                            <input type={type} placeholder={ph} value={newSocio[key]} required
                              onChange={e => setNewSocio({...newSocio,[key]:e.target.value})}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-600 font-bold mb-1">Estamento</label>
                            <select value={newSocio.estamento} onChange={e => setNewSocio({...newSocio,estamento:e.target.value})}
                              className="w-full p-2 border rounded-lg text-xs">
                              {['Enfermería','TENS','Conductores','Administrativo'].map(v=><option key={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-600 font-bold mb-1">Calidad</label>
                            <select value={newSocio.calidad} onChange={e => setNewSocio({...newSocio,calidad:e.target.value})}
                              className="w-full p-2 border rounded-lg text-xs">
                              {['Titular','Contrata','Reemplazo'].map(v=><option key={v}>{v}</option>)}
                            </select>
                          </div>
                        </div>
                        <button type="submit" className="w-full py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 transition">Confirmar Incorporación</button>
                      </form>
                    </div>
                  )}

                  <div className={`${role === 'admin' ? 'lg:col-span-8' : ''} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-sm">Padrón Electoral Oficial</h3>
                      <button onClick={() => triggerToast("Padrón exportado en formato CSV.")}
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
                          {sociosFiltrados.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{s.nombre}</div>
                                <span className="text-[9px] text-slate-400">AFUS-{String(s.id).padStart(3,'0')}</span>
                              </td>
                              <td className="p-3 font-mono text-slate-600">{s.rut}</td>
                              <td className="p-3">
                                <div className="font-semibold">{s.estamento}</div>
                                <div className="text-[10px] text-slate-500">{s.cargo}</div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.calidad==='Titular'?'bg-blue-100 text-blue-800':s.calidad==='Contrata'?'bg-purple-100 text-purple-800':'bg-orange-100 text-orange-800'}`}>
                                  {s.calidad}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${s.pagoCuota==='Al Día'?'bg-emerald-100 text-emerald-800':'bg-red-100 text-red-800'}`}>
                                  {s.pagoCuota}
                                </span>
                                <div className="text-[9px] text-slate-400 mt-0.5">{s.cuotasPagadas} meses</div>
                              </td>
                              {role === 'admin' && (
                                <td className="p-3 text-center">
                                  <button onClick={() => toggleSocioPago(s.id)}
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
            )}

            {/* ── FINANZAS ── */}
            {portalTab === 'finanzas' && (
              <div className="space-y-6">
                <SectionHeader title="Finanzas, Caja y Transparencia" sub="Control de caja, historial contable y rendición de fondos gremiales." />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Total Ingresos" value={`$${totalIngresos.toLocaleString('es-CL')}`} sub="Suscripciones + Aportes" color="text-emerald-700"/>
                  <StatCard label="Total Egresos"  value={`$${totalEgresos.toLocaleString('es-CL')}`}  sub="Asesorías + Administrativo" color="text-red-600"/>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wide mb-1">Caja Activa Disponible</span>
                    <span className="text-2xl font-extrabold text-emerald-900">${cajaDisponible.toLocaleString('es-CL')}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">Saldo neto en cuenta bancaria</span>
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${role === 'admin' ? 'lg:grid-cols-12' : ''} gap-6`}>
                  {role === 'admin' && (
                    <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
                      <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-700"/>Registrar Movimiento</h3>
                      <form onSubmit={handleAddTrans} className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-lg border">
                          {['Ingreso','Egreso'].map(t => (
                            <button key={t} type="button" onClick={() => setNewTrans({...newTrans,tipo:t})}
                              className={`py-1.5 text-xs font-bold rounded transition ${newTrans.tipo===t?(t==='Ingreso'?'bg-emerald-800 text-white':'bg-red-600 text-white'):'text-slate-600'}`}>
                              {t} {t==='Ingreso'?'(+)':'(-)'}
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Concepto / Glosa *</label>
                          <input type="text" placeholder="Ej: Pago asesoría jurídica" value={newTrans.concepto} required
                            onChange={e => setNewTrans({...newTrans,concepto:e.target.value})}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Monto ($ CLP) *</label>
                          <input type="number" placeholder="Ej: 50000" value={newTrans.monto} required min="1"
                            onChange={e => setNewTrans({...newTrans,monto:e.target.value})}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                        </div>
                        <button type="submit" className="w-full py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 transition">Registrar en Caja</button>
                      </form>
                    </div>
                  )}

                  <div className={`${role === 'admin' ? 'lg:col-span-8' : ''} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`}>
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-sm">Libro de Caja — Historial Contable</h3>
                      <button onClick={() => triggerToast("Libro de caja listo para imprimir.")}
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
                              <td className="p-3 font-mono text-slate-400">#MOV-{String(f.id).padStart(3,'0')}</td>
                              <td className="p-3 text-slate-600">{f.fecha}</td>
                              <td className="p-3 font-semibold text-slate-800">{f.concepto}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.tipo==='Ingreso'?'bg-emerald-100 text-emerald-800':'bg-red-100 text-red-800'}`}>{f.tipo}</span>
                              </td>
                              <td className={`p-3 text-right font-bold ${f.tipo==='Ingreso'?'text-emerald-700':'text-red-600'}`}>
                                {f.tipo==='Ingreso'?'+':'-'}${f.monto.toLocaleString('es-CL')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── VOTACIONES ── */}
            {portalTab === 'votaciones' && (
              <div className="space-y-6">
                <SectionHeader title="Votaciones Digitales y Escrutinios" sub="Procesos de sufragio con ministro de fe digital e inalterabilidad de actas." />

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-xs shadow-sm">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-1.5"><Shield className="w-4 h-4 text-amber-600"/>Cumplimiento Legal — Dirección del Trabajo</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Conforme al <strong>Dictamen N° 2532/48</strong>, las votaciones pueden efectuarse telemáticamente garantizando <strong>universalidad, secreto de voto y no-repudio</strong>. El sistema valida identidad sin vincular al candidato elegido.
                  </p>
                </div>

                {role === 'admin' && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-700"/>Iniciar Nueva Votación</h3>
                    <form onSubmit={handleAddVote} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-end">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Título *</label>
                        <input type="text" placeholder="Ej: Elección Delegado de Base" value={newVote.titulo} required
                          onChange={e => setNewVote({...newVote,titulo:e.target.value})}
                          className="w-full p-2 border rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Opciones (separadas por coma) *</label>
                        <input type="text" placeholder="Opción A, Opción B" value={newVote.opciones} required
                          onChange={e => setNewVote({...newVote,opciones:e.target.value})}
                          className="w-full p-2 border rounded-lg"/>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-slate-600 font-bold mb-1">Ministro de Fe</label>
                          <select value={newVote.ministroFe} onChange={e => setNewVote({...newVote,ministroFe:e.target.value})}
                            className="w-full p-2 border rounded-lg">
                            <option value="Autogestionado por Directorio">Directorio AFUSAMUT</option>
                            <option value="Inspección del Trabajo Talcahuano (Digital)">Inspección DT Digital</option>
                          </select>
                        </div>
                        <button type="submit" className="px-4 py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 h-fit self-end text-xs">Lanzar</button>
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
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${v.estado==='Activa'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-600'}`}>
                              {v.estado==='Activa'?'● Votación Activa':'Votación Finalizada'}
                            </span>
                            <span className="text-slate-400 text-[10px] font-mono">VOT-{String(v.id).padStart(3,'0')}</span>
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
                              <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{width:`${pct}%`}}/>
                            </div>
                          </div>
                          {(v.votoEmitido || v.estado === 'Finalizada') && (
                            <div className="bg-slate-50 p-4 rounded-xl border space-y-2.5 text-xs">
                              <span className="font-bold text-slate-800 block">Resultados parciales:</span>
                              {v.opciones.map((op, i) => {
                                const c = v.votosPorOpcion[i] || 0;
                                const p = v.votosRecibidos > 0 ? Math.round((c/v.votosRecibidos)*100) : 0;
                                return (
                                  <div key={op}>
                                    <div className="flex justify-between text-[10px] mb-1">
                                      <span className="font-semibold truncate pr-2">{op}</span>
                                      <span className="font-mono shrink-0">{c} ({p}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-amber-500 h-1.5 rounded-full" style={{width:`${p}%`}}/>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="p-4 border-t flex justify-end">
                          {v.estado === 'Activa' ? (
                            <button onClick={() => { setVotingModal(v); setSelectedOption(''); setSecurityRut(''); }}
                              disabled={v.votoEmitido}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${v.votoEmitido?'bg-slate-100 text-slate-400 cursor-not-allowed':'bg-emerald-950 text-white hover:bg-emerald-900'}`}>
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
            )}

            {/* ── BENEFICIOS ── */}
            {portalTab === 'beneficios' && (
              <div className="space-y-6">
                <SectionHeader title="Club de Alianzas y Beneficios" sub="Cupones y descuentos exclusivos para funcionarios SAMU Talcahuano." />
                <div className="bg-emerald-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6 shadow">
                  <div className="space-y-2">
                    <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">Alianzas 2026</span>
                    <h3 className="text-xl font-black">Club de Beneficios AFUSAMUT</h3>
                    <p className="text-xs text-emerald-200 max-w-lg">Gracias a nuestra formalización legal, hemos comenzado a cerrar importantes convenios con comercios de la Región del Biobío para todos los funcionarios del SAMU.</p>
                  </div>
                  <Award className="w-16 h-16 text-amber-400 shrink-0"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { badge:'bg-blue-100 text-blue-800', tipo:'Salud & Farmacia', titulo:'Farmacias Red Popular Talcahuano',
                      texto:'Descuento del 15% en medicamentos de catálogo y 5% adicional en medicamentos críticos para socios y sus cargas familiares.',
                      codigo:'POP-AFUSA' },
                    { badge:'bg-purple-100 text-purple-800', tipo:'Esparcimiento', titulo:'Cabañas de Veraneo Tomé-Dichato',
                      texto:'Tarifas especiales fuera de temporada con hasta 30% de rebaja para descanso del personal AFUSAMUT. Requiere reserva con 15 días de anticipación.',
                      codigo:'DICH-AFUSAMUT' },
                    { badge:'bg-amber-100 text-amber-800', tipo:'Educación', titulo:'Centro de Capacitación Prehospitalaria',
                      texto:'Becas del 20% para cursos de Reanimación Avanzada Pediátrica y de Adultos para mantener la acreditación obligatoria vigente.',
                      codigo:'ACAD-SAMU26' },
                  ].map(b => (
                    <div key={b.titulo} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="p-5 space-y-3 flex-1">
                        <span className={`${b.badge} text-[10px] font-bold px-2.5 py-0.5 rounded-full`}>{b.tipo}</span>
                        <h4 className="font-bold text-slate-900">{b.titulo}</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">{b.texto}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-mono">{b.codigo}</span>
                        <button onClick={() => triggerToast(`Cupón ${b.codigo} generado. Presentar en el comercio asociado.`)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 transition">Generar Cupón →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ESTATUTOS ── */}
            {portalTab === 'estatutos' && (
              <div className="space-y-6">
                <SectionHeader title="Estatutos Constitutivos" sub="Títulos, artículos y normativas de AFUSAMUT." />
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                    <input type="text" placeholder="Buscar en artículos estatutarios (ej: cuota, directorio, expulsión)…"
                      value={estatutoSearch} onChange={e => setEstatutoSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                  </div>
                </div>
                <div className="space-y-4">
                  {estatutosCapitulos.map((cap, ci) => {
                    const arts = cap.articulos.filter(a =>
                      !estatutoSearch || a.texto.toLowerCase().includes(estatutoSearch.toLowerCase()) || a.desc.toLowerCase().includes(estatutoSearch.toLowerCase())
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
                  {estatutoSearch && estatutosCapitulos.every(c => c.articulos.every(a =>
                    !a.texto.toLowerCase().includes(estatutoSearch.toLowerCase()) &&
                    !a.desc.toLowerCase().includes(estatutoSearch.toLowerCase())
                  )) && (
                    <div className="text-center py-10 text-slate-400 text-sm">No se encontraron artículos para "<strong>{estatutoSearch}</strong>"</div>
                  )}
                </div>
              </div>
            )}

            {/* ── BUZÓN ── */}
            {portalTab === 'buzon' && (
              <div className="space-y-6">
                <SectionHeader title="Buzón de Sugerencias y Consultas" sub="Canal directo de comunicación entre socios y el Directorio AFUSAMUT." />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
                    <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2"><Send className="w-4 h-4 text-emerald-700"/>Enviar Mensaje al Directorio</h3>
                    <form onSubmit={handleAddBuzon} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Categoría</label>
                        <select value={newBuzonMsg.categoria} onChange={e => setNewBuzonMsg({...newBuzonMsg,categoria:e.target.value})}
                          className="w-full p-2 border rounded-lg">
                          {['Consultas Gremiales','Seguridad y Salud Laboral','Convenios e Incorporación','Apoyo Jurídico / Ley 19.296'].map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Mensaje *</label>
                        <textarea rows={4} placeholder="Escriba su consulta o requerimiento con claridad…"
                          value={newBuzonMsg.mensaje} required
                          onChange={e => setNewBuzonMsg({...newBuzonMsg,mensaje:e.target.value})}
                          className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                      </div>
                      <button type="submit" className="w-full py-2 bg-emerald-950 text-white font-bold rounded-lg hover:bg-emerald-900 transition">Enviar Requerimiento Seguro</button>
                    </form>
                  </div>

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
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${b.estado==='Resuelto'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>
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
                                value={replyTexts[b.id] || ''}
                                onChange={e => setReplyTexts(prev => ({...prev,[b.id]:e.target.value}))}
                                className="w-full p-2 border rounded-lg bg-white resize-none focus:outline-none focus:ring-1 focus:ring-emerald-700"/>
                              <button onClick={() => handleAnswerTicket(b.id)}
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
            )}

          </main>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL VOTACIÓN
      ════════════════════════════════════════════════════════════════════ */}
      {votingModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-emerald-950 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm">Urna Digital AFUSAMUT</h3>
                <span className="text-[10px] text-emerald-300">Secreto del Sufragio · Ley N° 19.296</span>
              </div>
              <button onClick={() => setVotingModal(null)} className="text-emerald-300 hover:text-white p-1"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCastVote} className="p-6 space-y-5 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border space-y-1">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Consulta en curso</span>
                <p className="font-black text-slate-900 text-sm leading-tight">{votingModal.titulo}</p>
                <span className="text-[10px] text-slate-500">Fe: {votingModal.ministroFe}</span>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Seleccione su opción:</span>
                {votingModal.opciones.map(op => (
                  <label key={op} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedOption===op?'border-emerald-700 bg-emerald-50 font-bold text-emerald-900':'bg-white hover:bg-slate-50'}`}>
                    <input type="radio" name="voto" value={op} checked={selectedOption===op}
                      onChange={() => setSelectedOption(op)} className="accent-emerald-700"/>
                    <span>{op}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2 border-t space-y-2">
                <span className="font-bold text-slate-700 flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-amber-600"/>Validación de identidad</span>
                <p className="text-[10px] text-slate-500 leading-normal">Su RUT valida que es un socio registrado. No se vincula a la opción elegida, garantizando el secreto del voto.</p>
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
                <button type="button" onClick={() => setVotingModal(null)}
                  className="py-2.5 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit"
                  className="py-2.5 bg-emerald-950 text-white font-bold rounded-xl hover:bg-emerald-900 transition">Depositar Voto Secreto</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
