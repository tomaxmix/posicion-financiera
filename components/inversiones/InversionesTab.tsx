'use client';

import { useState } from 'react';
import { Fund } from '@/lib/types';
import FundChart from './FundChart';
import { fmt2, fmtPct, COLORS_INV } from '@/lib/utils';
import { InvDonut, BarChart } from '@/components/shared/Charts';
import AllocBars from './AllocBars';
import Tag from '@/components/shared/Tag';

interface Props {
  funds: Fund[];
  onDeleteFund?: (id: string) => void;
}

export default function InversionesTab({ funds, onDeleteFund }: Props) {
  const [invTab,      setInvTab]      = useState('overview');
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const invTotal = funds.reduce((s, f) => s + (f.m || 0), 0);
  const ti       = funds.reduce((s, f) => s + (f.inv || 0), 0);
  const pl       = invTotal - ti;
  const plp      = ti ? pl / ti * 100 : 0;
  const neg      = funds.filter(f => f.r < 0).length;
  const best     = [...funds].sort((a, b) => ((b.m||0)-(b.inv||0)) - ((a.m||0)-(a.inv||0)))[0];

  const card   = { background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: '1.25rem 1.5rem' } as React.CSSProperties;
  const cardSm = { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '1rem 1.1rem' } as React.CSSProperties;
  const sec    = { fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '0.75rem' };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { lbl: 'Valor total',     val: fmt2(invTotal) + ' €', sub: funds.length + ' posiciones',           c: '' },
          { lbl: 'Capital inv.',    val: fmt2(ti) + ' €',       sub: 'Coste histórico',                      c: '' },
          { lbl: 'Plusvalía',       val: fmt2(pl) + ' €',       sub: fmtPct(plp),                            c: pl >= 0 ? '#10b981' : '#ef4444' },
          { lbl: 'En negativo',     val: String(neg),            sub: 'posiciones',                           c: neg > 0 ? '#ef4444' : '#10b981' },
          { lbl: 'Mayor plusvalía', val: fmt2((best?.m||0)-(best?.inv||0)) + ' €', sub: best?.short || '',  c: '#10b981' },
        ].map(m => (
          <div key={m.lbl} style={cardSm}>
            <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.lbl}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: m.c || '#f1f5f9' }}>{m.val}</div>
            <div style={{ fontSize: 11, color: m.c || '#475569', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '1rem', background: '#111827', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid #1f2937', flexWrap: 'wrap' as const }}>
        {[['overview','Visión general'],['fondos','Fondos'],['plusvalias','Plusvalías'],['alloc','Distribución']].map(([k,v]) => (
          <button key={k} onClick={() => setInvTab(k)} style={{
            background: invTab === k ? '#0a0f1e' : 'transparent',
            color: invTab === k ? '#f1f5f9' : '#64748b',
            border: 'none', borderRadius: 7, padding: '6px 12px',
            boxShadow: invTab === k ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
            fontSize: 12, cursor: 'pointer', fontWeight: 500,
          }}>{v}</button>
        ))}
      </div>

      {/* Overview */}
      {invTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={card}>
              <div style={sec}>Distribución por valor</div>
              <div style={{ position: 'relative', height: 200 }}><InvDonut funds={funds} /></div>
            </div>
            <div style={card}>
              <div style={sec}>Leyenda</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', maxHeight: 210 }}>
                {funds.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS_INV[i % COLORS_INV.length], flexShrink: 0, marginRight: 8 }} />
                    <span style={{ flex: 1, color: '#64748b', fontSize: 11 }}>{f.short}</span>
                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 11 }}>{fmt2(f.m)} €</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla plusvalías */}
          <div style={{ ...card, marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem 0.5rem' }}><div style={sec}>Plusvalía por fondo</div></div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>{['Fondo','Capital inv.','Valor actual','Plusvalía','%','Precio publicado'].map(h => (
                    <th key={h} style={{ fontSize: 10, color: '#475569', fontWeight: 600, textAlign: h === 'Fondo' ? 'left' : 'right', padding: '8px 12px', borderBottom: '1px solid #1f2937', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...funds].sort((a,b) => ((b.m||0)-(b.inv||0))-((a.m||0)-(a.inv||0))).map(f => {
                    const p = (f.m||0) - (f.inv||0);
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#e2e8f0' }}>{f.short}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>{fmt2(f.inv)} €</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#e2e8f0' }}>{fmt2(f.m)} €</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: p >= 0 ? '#10b981' : '#ef4444' }}>{p >= 0 ? '+' : ''}{fmt2(p)} €</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: f.r >= 0 ? '#10b981' : '#ef4444' }}>{fmtPct(f.r)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {f.lastPriceDate ? f.lastPriceDate : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #1f2937' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f1f5f9' }}>Total</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#e2e8f0' }}>{fmt2(ti)} €</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#e2e8f0' }}>{fmt2(invTotal)} €</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: pl >= 0 ? '#10b981' : '#ef4444' }}>{pl >= 0 ? '+' : ''}{fmt2(pl)} €</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: plp >= 0 ? '#10b981' : '#ef4444' }}>{fmtPct(plp)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={card}><div style={sec}>Peso por tipo de activo</div><AllocBars funds={funds} /></div>
        </div>
      )}

      {/* Fondos — con desplegable de gráfico y botón eliminar */}
      {invTab === 'fondos' && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {/* Cabecera tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 110px 110px 80px 36px 36px', gap: 0, padding: '8px 12px 6px', borderBottom: '1px solid #1f2937' }}>
            {['Fondo','Tipo','Valor actual','Capital inv.','+/- %','',''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {funds.map(f => {
            const isOpen = expandedId === f.id;
            return (
              <div key={f.id} style={{ borderBottom: '1px solid #0f172a' }}>
                {/* Fila principal */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 110px 110px 80px 36px 36px', gap: 0, padding: '10px 12px', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isOpen ? null : f.id)}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>{f.short}</div>
                    <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>{f.isin}</div>
                    {f.lastPriceDate && (
                      <div style={{ fontSize: 9, color: '#1e3a5f', marginTop: 1 }}>
                        precio: {f.lastPriceDate}
                      </div>
                    )}
                  </div>
                  <div><Tag type={f.type} /></div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: '#e2e8f0', fontSize: 12 }}>{fmt2(f.m)} €</div>
                  <div style={{ textAlign: 'right', color: '#64748b', fontSize: 12 }}>{fmt2(f.inv)} €</div>
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: f.r >= 0 ? '#10b981' : '#ef4444' }}>{fmtPct(f.r)}</div>
                  {/* Botón expandir */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </div>
                  {/* Botón eliminar */}
                  <div style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    {onDeleteFund && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${f.short}" de tu cartera?`)) onDeleteFund(f.id);
                        }}
                        title="Eliminar fondo"
                        style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 5, color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '2px 6px', lineHeight: 1.4 }}
                      >✕</button>
                    )}
                  </div>
                </div>

                {/* Gráfico expandible */}
                {isOpen && <FundChart fund={f} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Plusvalías */}
      {invTab === 'plusvalias' && (
        <div style={card}>
          <div style={sec}>Rentabilidad acumulada por posición</div>
          <div style={{ position: 'relative', height: Math.max(funds.length * 38 + 80, 300) }}>
            <BarChart funds={funds} />
          </div>
        </div>
      )}

      {/* Distribución */}
      {invTab === 'alloc' && (
        <div style={card}><div style={sec}>Distribución por tipo de activo</div><AllocBars funds={funds} /></div>
      )}
    </div>
  );
}
