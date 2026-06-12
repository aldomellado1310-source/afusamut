import { useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';

interface ProtectedPortalProps {
  children: ReactNode;
  /** Called after successful login */
  onLogin?: () => void;
}

/**
 * In demo mode (no Firebase) renders children directly.
 * In Firebase mode, requires authentication before rendering children.
 */
export default function ProtectedPortal({ children, onLogin }: ProtectedPortalProps) {
  const { user, loading, demoMode } = useAuth();
  const [showLogin, setShowLogin]   = useState(false);

  // Still resolving auth state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-emerald-950">
        <div className="text-emerald-300 text-sm animate-pulse">Cargando…</div>
      </div>
    );
  }

  // Demo mode — no auth required
  if (demoMode) return <>{children}</>;

  // Authenticated
  if (user) return <>{children}</>;

  // Not authenticated
  return (
    <>
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 p-8">
          <p className="text-slate-500 text-sm">Debes iniciar sesión para acceder al portal.</p>
          <button
            onClick={() => setShowLogin(true)}
            className="px-6 py-3 bg-emerald-950 text-white font-bold rounded-xl hover:bg-emerald-900 transition text-sm"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            onLogin?.();
          }}
        />
      )}
    </>
  );
}
