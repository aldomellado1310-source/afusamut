import { Shield, Vote, FileText, Check, ArrowRight, Lock, Menu, X } from 'lucide-react';
import AfusamutLogo from '@/components/ui/AfusamutLogo';

interface LandingPageProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  goPortal: (tab?: string, role?: string) => void;
}

export default function LandingPage({ mobileMenuOpen, setMobileMenuOpen, goPortal }: LandingPageProps) {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-xl border-b border-emerald-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AfusamutLogo className="w-12 h-12" />
            <div className="text-left">
              <h1 className="font-black text-lg tracking-tight leading-none">AFUSAMUT</h1>
              <span className="text-[10px] text-emerald-300 font-bold tracking-widest uppercase">SAMU Talcahuano</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-emerald-100">
            <span className="hover:text-white cursor-pointer transition">Inicio</span>
            <span onClick={() => goPortal('estatutos')} className="hover:text-white cursor-pointer transition">Estatutos</span>
            <span onClick={() => goPortal('beneficios')} className="hover:text-white cursor-pointer transition">Convenios</span>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => goPortal('inicio', 'socio')}
              className="px-4 py-2 text-sm font-bold border border-emerald-600 text-emerald-300 hover:bg-emerald-900/40 rounded-lg transition">
              Portal Socio/a
            </button>
            <button onClick={() => goPortal('inicio', 'admin')}
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
            <span onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-emerald-100 cursor-pointer">Inicio</span>
            <span onClick={() => goPortal('estatutos')} className="block font-semibold text-emerald-100 cursor-pointer">Estatutos</span>
            <span onClick={() => goPortal('beneficios')} className="block font-semibold text-emerald-100 cursor-pointer">Convenios</span>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => goPortal('inicio', 'socio')} className="py-2 text-sm font-bold border border-emerald-700 text-emerald-300 rounded-lg">Portal Socio</button>
              <button onClick={() => goPortal('inicio', 'admin')} className="py-2 text-sm font-bold bg-amber-500 text-emerald-950 rounded-lg flex items-center justify-center gap-1"><Lock className="w-4 h-4"/>Directorio</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative bg-emerald-950 text-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '30px 30px' }} />
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
              {[['09 Abr', 'Constitución 2026'], ['100%', 'Prehospitalario'], ['Ley', '19.296']].map(([v, l]) => (
                <div key={l} className="bg-emerald-900/60 border border-emerald-800 p-3 rounded-xl text-center">
                  <span className="block text-xl font-black text-amber-400">{v}</span>
                  <span className="text-[10px] text-emerald-300">{l}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-4">
              <button onClick={() => goPortal('inicio', 'socio')}
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
              { icon: Shield,   color: 'bg-emerald-100 text-emerald-800', title: 'Seguridad del Trabajador Sanitario', text: 'Velamos por condiciones dignas y seguras en ruta, bases y despachos, reduciendo el riesgo psicosocial e institucional.' },
              { icon: Vote,     color: 'bg-amber-100 text-amber-800',     title: 'Democracia e Inalterabilidad',      text: 'Soberanía asambleísta respaldada por mecanismos de votación transparente, secreta y conforme a la Dirección del Trabajo.' },
              { icon: FileText, color: 'bg-blue-100 text-blue-800',       title: 'Transparencia Total de Fondos',     text: 'Rendiciones semestrales automatizadas y acceso directo para que cada socio verifique la inversión de sus cuotas.' },
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
                ['Directorio de 2 años', 'Representatividad equitativa de todos los estamentos del SAMU.'],
                ['Cuota $4.000 CLP', 'Reajustable según IPC acumulado cada dos años.'],
                ['Asamblea Telemática', 'Válida jurídicamente con grabación y actas digitales.'],
              ].map(([t, d]) => (
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
                ['Participación Plena', 'Derecho a voz y voto en todas las asambleas ordinarias y extraordinarias, físicas o telemáticas.'],
                ['Elección Representativa', 'Elegir y ser elegido con antigüedad mínima de 6 meses de afiliación.'],
                ['Transparencia Financiera', 'Acceder a información financiera y actas custodiadas por Secretario y Tesorero.'],
              ].map(([t, d]) => (
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
              { letra: 'P', cargo: 'Presidente / Presidenta', badge: 'bg-amber-100 text-amber-800',   desc: 'Representación legal judicial y extrajudicial. Convocatoria y dirección de asambleas.' },
              { letra: 'S', cargo: 'Secretario / Secretaria', badge: 'bg-emerald-100 text-emerald-800', desc: 'Control del Padrón de Socios, redacción de actas y coordinación de procesos eleccionarios.' },
              { letra: 'T', cargo: 'Tesorero / Tesorera',     badge: 'bg-emerald-100 text-emerald-800', desc: 'Administración contable, resguardo del patrimonio y rendición financiera semestral.' },
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
            <p className="cursor-pointer hover:text-white" onClick={() => goPortal('inicio', 'admin')}>Acceso Directorio</p>
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
  );
}
