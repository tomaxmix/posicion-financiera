'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/auth/LoginScreen';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#334155', fontSize: 13 }}>Iniciando sesión…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Sin usuario (o acceso denegado) → pantalla de login
  // LoginScreen ya maneja el estado denied internamente
  if (!user) return <LoginScreen />;

  return <Dashboard />;
}
