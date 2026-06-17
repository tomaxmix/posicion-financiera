'use client';

import { useState } from 'react';
import { Fund } from '@/lib/types';
import { S } from '@/lib/styles';
import FundChart from '@/components/inversiones/FundChart';
import type { MstarResult } from '@/app/api/morningstar/route';

interface Props {
  funds: Fund[];
  onAddFund?: (isin: string, name: string) => void;
}

const QUICK = [
  { label: '🌍 Indexados globales', q: 'world index' },
  { label: '📈 Renta variable Europa', q: 'Europe equity' },
  { label: '🏦 Renta fija EUR', q: 'bond EUR' },
  { label: '⚡ Tecnología global', q: 'technology global' },
  { label: '🌱 ESG sostenible', q: 'ESG sustainable' },
  { label: '🏠 Real Estate', q: 'real estate REIT' },
];

function Stars({ n }: { n: number | null }) {
  if (!n) return <span style={{ color: '#475569', fontSize: 11 }}>Sin rating</span>;
  return (
    <span style={{ color: '#f59e0b', fontSize: 14, letterSpacing: 1 }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

function ReturnBadge({ v, label }: { v: number | null; label: string }) {
  if (v === null) return <span style={{ color: '#334155', fontSize: 11 }}>{label}: —</span>;
  return (
    <span style={{ fontSize: 11, color: v >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
      {label}: {v >= 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

function AnalystBadge({ r }: { r: string | null }) {
  if (!r) return null;
  const map: Record<string, { color: string; label: string }> = {
    '1': { color: '#f59e0b', label: 'Gold'   },
    '2': { color: '#94a3b8', label: 'Silver' },
    '3': { color: '#cd7c2e', label: 'Bronze' },
    '4': { color: '#475569', label: 'Neutral'},
    '5': { color: '#ef4444', label: 'Negative'},
  };
  const m = map[r];
  if (!m) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: m.color + '22', color: m.color, border: `1px solid ${m.color}44` }}>
      {m.label}
    </span>
  );
}

export default function MorningstarTab({ funds, onAddFund }: Props) {
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<MstarResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [added,      setAdded]      = useState<Set<string>>(new Set());
  const [searched,   setSearched]   = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const existingIsins = new Set(funds.map(f => f.isin));

  const search = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res  = await fetch('/api/morningstar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      if (data.error && !data.results?.length) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e: any) {
      setError('No se pudo conectar con Morningstar. Inténtalo de nuevo.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (r: MstarResult) => {
    if (onAddFund && r.isin) { onAddFund(r.isin, r.name); setAdded(p => new Set([...p, r.isin])); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...S.card, marginBottom: '1rem', background: 'linear-gradient(135deg,#1a0a2e,#0f1629)', borderColor: '#2d1b69' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>⭐</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>Morningstar Fund Screener</div>
            <div style={{ fontSize: 11, color: '#475569' }}>Ratings · TER · Rentabilidad 1/3/5 años · Categoría · Medalla analista</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>● Morningstar ES</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', alignItems: 'start' }}>

        {/* Panel principal */}
        <div>
          {/* Buscador */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
            <input
              style={{ ...S.inp, flex: 1, padding: '11px 14px' }}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Ej: Vanguard, iShares world, renta fija EUR..."
            />
            <button
              onClick={() => search(query)}
              disabled={loading || !query.trim()}
              style={{ ...S.btnPurp, padding: '11px 20px', opacity: loading || !query.trim() ? 0.5 : 1, flexShrink: 0 } as React.CSSProperties}
            >
              {loading ? '⟳' : 'Buscar'}
            </button>
          </div>

          {/* Estado inicial / error */}
          {!searched && !loading && (
            <div style={{ ...S.card, textAlign: 'center', padding: '3rem 1rem', color: '#334155' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 14, color: '#475569', marginBottom: 6 }}>Busca fondos con rating Morningstar</div>
              <div style={{ fontSize: 12, color: '#334155' }}>Usa los accesos rápidos o escribe tu búsqueda</div>
            </div>
          )}

          {error && (
            <div style={{ ...S.card, borderColor: '#ef444433', color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>
          )}

          {/* Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ ...S.card, height: 90, background: 'linear-gradient(90deg,#111827 25%,#1f2937 50%,#111827 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          )}

          {/* Resultados */}
          {!loading && searched && results.length === 0 && !error && (
            <div style={{ ...S.card, textAlign: 'center', color: '#475569', fontSize: 13 }}>
              Sin resultados para "{query}". Prueba con otro término.
            </div>
          )}

          {!loading && results.map(r => {
            const inPortfolio = existingIsins.has(r.isin);
            const isAdded     = added.has(r.isin);
            const cardKey     = r.id || r.isin;
            const isExpanded  = expandedId === cardKey;

            // Objeto Fund mínimo para FundChart
            const pseudoFund: Fund = {
              id: cardKey, isin: r.isin, short: r.name,
              type: r.type === 'ETF' ? 'ETF' : 'RV',
              m: 0, inv: 0, r: 0,
            };

            // Búsqueda en Morningstar ES por ISIN (más fiable que SecId inventado por Claude)
            const mstarUrl = r.isin
              ? `https://www.morningstar.es/es/funds/SecuritySearchResults.aspx?search=${r.isin}`
              : `https://www.morningstar.es/es/funds/SecuritySearchResults.aspx?search=${encodeURIComponent(r.name)}`;

            return (
              <div key={cardKey} style={{ ...S.card, marginBottom: 8, padding: 0, overflow: 'hidden', borderColor: inPortfolio ? '#3b82f633' : isExpanded ? '#a78bfa44' : '#1f2937' }}>
                {/* Fila principal — clicable para expandir */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '1rem 1.25rem', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : cardKey)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{r.name || 'Sin nombre'}</div>
                      <AnalystBadge r={r.analystRating} />
                      {inPortfolio && <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>EN CARTERA</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Stars n={r.stars} />
                      {r.category && <span style={{ fontSize: 11, color: '#475569' }}>· {r.category}</span>}
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {r.ter !== null && (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          TER: <strong style={{ color: r.ter < 0.3 ? '#10b981' : r.ter > 1 ? '#ef4444' : '#f59e0b' }}>{r.ter.toFixed(2)}%</strong>
                        </span>
                      )}
                      <ReturnBadge v={r.return1y} label="1A" />
                      <ReturnBadge v={r.return3y} label="3A" />
                      <ReturnBadge v={r.return5y} label="5A" />
                    </div>

                    {r.isin && (
                      <div style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>
                        ISIN: {r.isin}
                        {r.currency && <span style={{ marginLeft: 8 }}>· {r.currency}</span>}
                        {r.exchange && <span style={{ marginLeft: 8 }}>· {r.exchange}</span>}
                      </div>
                    )}
                  </div>

                  {/* Acciones: añadir + link */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {r.isin && !inPortfolio && (
                      <button
                        onClick={() => handleAdd(r)}
                        disabled={isAdded}
                        style={{
                          fontSize: 11, padding: '6px 14px', borderRadius: 8, cursor: isAdded ? 'default' : 'pointer',
                          background: isAdded ? '#064e3b' : 'linear-gradient(135deg,#10b981,#059669)',
                          border: 'none', color: '#fff', fontWeight: 700, fontFamily: 'inherit',
                        }}
                      >
                        {isAdded ? '✓ Añadido' : '+ Añadir'}
                      </button>
                    )}
                    {mstarUrl && (
                      <a
                        href={mstarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 10, color: '#a78bfa', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        ⭐ Ver en Morningstar ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Desplegable: gráfico */}
                {isExpanded && r.isin && (
                  <FundChart fund={pseudoFund} />
                )}
              </div>
            );
          })}
        </div>

        {/* Panel derecho: accesos rápidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...S.sec, marginBottom: 4 }}>Búsquedas rápidas</div>
          {QUICK.map((q, i) => (
            <button
              key={i}
              onClick={() => { setQuery(q.q); search(q.q); }}
              disabled={loading}
              style={{
                ...S.card, display: 'block', width: '100%', textAlign: 'left',
                cursor: loading ? 'not-allowed' : 'pointer', padding: '0.75rem 1rem',
                borderRadius: 10, opacity: loading ? 0.5 : 1, fontFamily: 'inherit',
                border: '1px solid #1f2937', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#a78bfa33'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f2937'; }}
            >
              <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{q.label}</div>
            </button>
          ))}

          <div style={{ ...S.card, padding: '0.875rem 1rem', marginTop: 4, background: '#0a0f1e', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.7 }}>
              💡 <strong style={{ color: '#475569' }}>Datos de:</strong><br />
              · Morningstar España<br />
              · Rating ★ 1–5 estrellas<br />
              · Medalla analista (Gold/Silver/Bronze)<br />
              · TER en verde si {'<'} 0.30%<br />
              · Rentabilidad neta anualizada
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
