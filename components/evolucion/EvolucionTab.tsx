'use client';

import { HistoryEntry } from '@/lib/types';
import { fmt2 } from '@/lib/utils';
import { LineChart } from '@/components/shared/Charts';
import EvoTable from './EvoTable';

interface Props {
  history: HistoryEntry[];
  patrimonioLiquido: number;
  cuentasTotal: number;
  invTotal: number;
  onDelete: (i: number) => void;
  onClear: () => void;
}

export default function EvolucionTab({ history, patrimonioLiquido, cuentasTotal, invTotal, onDelete, onClear }: Props) {
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
    </div>
  );
}
