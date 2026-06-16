'use client';

import { HistoryEntry, Child } from '@/lib/types';
import { fmt, fmt2, fmtPct } from '@/lib/utils';
import { LineChart } from '@/components/shared/Charts';
import EvoTable from './EvoTable';

interface Props {
  history: HistoryEntry[];
  patrimonioLiquido: number;
  cuentasTotal: number;
  invTotal: number;
  onDelete: (i: number) => void;
  onClear: () => void;
  children?: Child[];
}

export default function EvolucionTab({ history, patrimonioLiquido, cuentasTotal, invTotal, onDelete, onClear, children = [] }: Props) {
  const card    = { background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: '1.25rem 1.5rem' } as React.CSSProperties;
  const sec     = { fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '0.75rem' };
  const divider = { height: 1, background: '#1f2937', margin: '1rem 0' };

  const noData = (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: 13 }}>
      Necesitas al menos 2 snapshots para ver la gráfica.<br />
      Pulsa <strong style={{ color: '#3b82f6' }}>📌 Snapshot</strong> para empezar.
    </div>
  );

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Evolución histórica</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{history.length} snapshots registrados</div>
        </div>
        {history.length > 0 && (
          <button onClick={onClear} style={{ fontSize: 11, padding: '6px 14px', border: '1px solid #ef444433', borderRadius: 8, background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
            Borrar todo el historial
          </button>
        )}
      </div>

      {[
        { label: 'Evolución del patrimonio',       sub: 'Sin inmobiliario ni deudas — Cuentas + Inversiones', dataKey: 'patrimonio' as keyof HistoryEntry, color: '#3b82f6', current: patrimonioLiquido },
        { label: 'Evolución cuentas corrientes',   sub: '',                                                     dataKey: 'cuentas'    as keyof HistoryEntry, color: '#06b6d4', current: cuentasTotal },
        { label: 'Evolución inversiones',          sub: '',                                                     dataKey: 'inv'        as keyof HistoryEntry, color: '#10b981', current: invTotal },
      ].map((g, idx) => (
        <div key={String(g.dataKey)} style={{ ...card, marginBottom: idx < 2 ? '1rem' : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <div style={sec}>{g.label}</div>
              {g.sub && <div style={{ fontSize: 10, color: '#475569', marginTop: -6 }}>{g.sub}</div>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{fmt2(g.current)} €</div>
          </div>
          {history.length < 2 ? noData : (
            <div style={{ position: 'relative', height: 200 }}>
              <LineChart history={history} dataKey={g.dataKey} color={g.color} label={g.label} />
            </div>
          )}
          <div style={divider} />
          <EvoTable history={history} dataKey={g.dataKey} onDelete={onDelete} />
        </div>
      ))}

      {/* ── SECCIÓN HIJOS ── */}
      {children.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          {/* Separador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: '#1f2937' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              Evolución de los hijos
            </div>
            <div style={{ flex: 1, height: 1, background: '#1f2937' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {children.map((child, ci) => {
              const color      = ci === 0 ? '#3b82f6' : '#10b981';
              const totalCtas  = child.cuentas.reduce((s, c) => s + (c.value || 0), 0);
              const totalInvC  = child.funds.reduce((s, f) => s + (f.m || 0), 0);
              const total      = totalCtas + totalInvC;
              const history    = child.history || [];
              const lastH      = history[history.length - 1];
              const prevH      = history[history.length - 2];
              const diff       = lastH && prevH ? lastH.patrimonio - prevH.patrimonio : null;
              const objetivo   = child.objetivo || 0;
              const progressPct= objetivo > 0 ? Math.min(total / objetivo * 100, 100) : 0;

              return (
                <div key={child.id} style={{ background: '#111827', border: `1px solid ${color}22`, borderRadius: 14, padding: '1.25rem 1.5rem' }}>
                  {/* Header hijo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>{child.name}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{history.length} snapshots</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 2 }}>{fmt(total)} €</div>
                      {diff !== null && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: diff >= 0 ? '#10b981' : '#ef4444' }}>
                          {diff >= 0 ? '+' : ''}{fmt2(diff)} € último período
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Distribución cuentas vs inversión */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                    {[
                      { lbl: 'Cuentas', val: totalCtas, c: '#3b82f6' },
                      { lbl: 'Indexa', val: totalInvC, c: '#10b981' },
                    ].map(m => (
                      <div key={m.lbl} style={{ background: '#0a0f1e', borderRadius: 8, padding: '0.6rem 0.875rem', border: `1px solid ${m.c}22` }}>
                        <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{m.lbl}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{fmt(m.val)} €</div>
                      </div>
                    ))}
                  </div>


                  {/* Gráfica o mensaje */}
                  {history.length < 2 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#334155', fontSize: 12 }}>
                      Pulsa 📌 junto a <strong style={{ color }}>{child.name}</strong> para empezar a registrar su evolución
                    </div>
                  ) : (
                    <div style={{ position: 'relative', height: 120 }}>
                      <LineChart history={history} dataKey="patrimonio" color={color} label={child.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
