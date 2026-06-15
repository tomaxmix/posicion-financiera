'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, denied } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try { await signInWithGoogle(); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      padding: '1rem',
    }}>
      {/* Fondo con puntos sutiles */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.04) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>

        {/* Logo / Icono */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #1d4ed8, #0891b2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: '1.25rem',
            boxShadow: '0 0 40px rgba(59,130,246,0.25)',
          }}>
            📊
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: '#f8fafc',
            letterSpacing: '-0.03em', margin: '0 0 6px',
          }}>
            Posición Financiera
          </h1>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            Dashboard financiero personal y familiar
          </p>
        </div>

        {/* Card principal */}
        <div style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: 20,
          padding: '2rem 2.25rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>

          {/* Stats decorativas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '2rem' }}>
            {[
              { label: 'Patrimonio',  val: '1.16M €', color: '#3b82f6' },
              { label: 'Inversiones', val: '403K €',  color: '#10b981' },
              { label: 'Fondos',      val: '15 pos.', color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#0a0f1e', borderRadius: 10,
                padding: '0.75rem', textAlign: 'center',
                border: '1px solid #1f2937',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mensaje de error si email no autorizado */}
          {denied && (
            <div style={{
              background: '#450a0a', border: '1px solid #7f1d1d',
              borderRadius: 10, padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600, marginBottom: 3 }}>
                ⛔ Acceso no autorizado
              </div>
              <div style={{ fontSize: 12, color: '#f87171' }}>
                Esta cuenta de Google no tiene permiso para acceder. Usa una cuenta autorizada.
              </div>
            </div>
          )}

          {/* Botón Google */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              width: '100%', padding: '13px 20px',
              background: loading ? '#1e293b' : '#ffffff',
              color: '#1a1a1a', border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f0f4ff'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
          >
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ color: '#64748b' }}>Conectando…</span>
              </>
            ) : (
              <>
                {/* Logo Google SVG */}
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Acceder con Google
              </>
            )}
          </button>

          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #1f2937', paddingTop: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#334155', margin: 0, lineHeight: 1.6 }}>
              🔒 Acceso restringido · Solo cuentas autorizadas<br />
              Tus datos se guardan cifrados en la nube
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#1e293b', marginTop: '1.5rem' }}>
          Posición Financiera Personal · {new Date().getFullYear()}
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}
