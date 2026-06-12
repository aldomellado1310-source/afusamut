import { useState, type FormEvent } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { signIn } from '@/services/authService';
import AfusamutLogo from '@/components/ui/AfusamutLogo';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('wrong-password') || msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('Correo o contraseña incorrectos.');
      } else if (msg.includes('too-many-requests')) {
        setError('Demasiados intentos. Intente más tarde.');
      } else {
        setError('Error al iniciar sesión. Verifique sus credenciales.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-emerald-950 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AfusamutLogo className="w-9 h-9" />
            <div>
              <h3 className="font-black text-sm">Acceso al Portal</h3>
              <span className="text-[10px] text-emerald-300">AFUSAMUT · Área restringida</span>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Correo electrónico</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@afusamut.cl"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Contraseña</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-emerald-950 text-white font-bold rounded-xl hover:bg-emerald-900 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Ingresando…' : 'Ingresar al Portal'}
          </button>

          <p className="text-center text-[10px] text-slate-400 pt-1">
            Solo socios registrados en el padrón de AFUSAMUT.
          </p>
        </form>
      </div>
    </div>
  );
}
