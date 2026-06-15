// ── Tokens de diseño compartidos (idénticos al artefacto original) ──────────
import React from 'react';

export const S = {
  card:    { background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: '1.25rem 1.5rem' } as React.CSSProperties,
  cardSm:  { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '1rem 1.1rem'   } as React.CSSProperties,
  inner:   { background: '#0a0f1e', borderRadius: 10, padding: '0.85rem 1rem'                               } as React.CSSProperties,
  sec:     { fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' } as React.CSSProperties,
  lbl:     { fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' } as React.CSSProperties,
  inp:     { width: '100%', padding: '9px 11px', fontSize: 13, border: '1px solid #1f2937', borderRadius: 8, background: '#0a0f1e', color: '#e2e8f0', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  div:     { height: 1, background: '#1f2937', margin: '1rem 0' } as React.CSSProperties,
  btn:     { fontSize: 12, padding: '8px 16px', border: '1px solid #1f2937', borderRadius: 8, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' } as React.CSSProperties,
  btnP:    { fontSize: 12, padding: '8px 16px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' } as React.CSSProperties,
  btnG:    { fontSize: 12, padding: '8px 16px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' } as React.CSSProperties,
  btnPurp: { fontSize: 12, padding: '8px 16px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' } as React.CSSProperties,
  subTabs: { display: 'flex', gap: 2, marginBottom: '1rem', background: '#111827', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid #1f2937', flexWrap: 'wrap' } as React.CSSProperties,
};

export const subTabBtn = (active: boolean): React.CSSProperties => ({
  background: active ? '#0a0f1e' : 'transparent',
  color: active ? '#f1f5f9' : '#64748b',
  border: 'none', borderRadius: 7, padding: '6px 12px',
  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
  fontSize: 12, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
});

export const thStyle: React.CSSProperties = {
  fontSize: 10, color: '#475569', fontWeight: 600, textAlign: 'left',
  padding: '8px 12px 10px', borderBottom: '1px solid #1f2937',
  textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.05em',
};
export const tdStyle: React.CSSProperties = { padding: '9px 12px', color: '#e2e8f0' };
export const trStyle: React.CSSProperties = { borderBottom: '1px solid #0f172a' };
