import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, getUserRole } from '@/services/authService';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { RolUsuario } from '@/types/index';

interface AuthState {
  /** null = not logged in, undefined = loading */
  user:     User | null | undefined;
  rol:      RolUsuario;
  loading:  boolean;
  /** true when Firebase is not configured (demo mode) */
  demoMode: boolean;
}

const AuthContext = createContext<AuthState>({
  user:     undefined,
  rol:      'socio',
  loading:  true,
  demoMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null | undefined>(undefined);
  const [rol,     setRol]     = useState<RolUsuario>('socio');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Demo mode: no Firebase → treat as logged-in socio instantly
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const role = await getUserRole(firebaseUser.uid);
        setRol(role);
      } else {
        setRol('socio');
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, rol, loading, demoMode: !isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
