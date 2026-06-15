'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

/* ── Lista de emails autorizados ─────────────────────────────────────────── */
const ALLOWED_EMAILS = [
  'susanacatalansalvador@gmail.com',
  // ⬇ Añade aquí tu Gmail personal
  process.env.NEXT_PUBLIC_OWNER_EMAIL || '',
].map(e => e.toLowerCase().trim()).filter(Boolean);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  denied: boolean;       // true si el email no está autorizado
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, denied: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied,  setDenied]  = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const email = (u.email || '').toLowerCase();
        if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
          // Email no autorizado — cerrar sesión inmediatamente
          await signOut(auth);
          setUser(null);
          setDenied(true);
        } else {
          setUser(u);
          setDenied(false);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    setDenied(false);
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setDenied(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, denied, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
