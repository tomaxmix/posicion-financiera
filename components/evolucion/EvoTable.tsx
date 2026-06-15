'use client';

import { HistoryEntry } from '@/lib/types';
import { fmt2 } from '@/lib/utils';

interface Props {
  history: HistoryEntry[];
  dataKey: keyof HistoryEntry;
  onDelete: (i: number) => void;
}

export default function EvoTable({ history, dataKey, onDelete }: Props) {
  if (history.length === 0)
    return <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '1rem' }}>Sin snapshots aún.</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          {['Fecha','Valor','Variación €','Variación %',''].map(h => (
            <th key={h} style={{ fontSize: 10, color: '#475569', fontWeight: 600, textAlign: h === '' ? 'center' : 'left', padding: '8px 12px 10px', borderBottom: '1px solid #1f2937', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {history.map((h, i) => {
          const prev     = i > 0 ? (history[i - 1][dataKey] as number) : null;
          const curr     = h[dataKey] as number;
          const diff     = prev != null ? curr - prev : null;
          const diffPct  = diff != null && prev != null && prev > 0 ? diff / prev * 100 : null;
          return (
            <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
              <td style={{ padding: '9px 12px', color: '#e2e8f0', fontWeight: 500 }}>{h.date}</td>
              <td style={{ padding: '9px 12px', color: '#e2e8f0', fontWeight: 600 }}>{fmt2(curr)} €</td>
              <td style={{ padding: '9px 12px', fontWeight: 600, color: diff === null ? '#475569' : diff >= 0 ? '#10b981' : '#ef4444' }}>
                {diff === null ? '—' : (diff >= 0 ? '+' : '') + fmt2(diff) + ' €'}
              </td>
              <td style={{ padding: '9px 12px', fontWeight: 600, color: diffPct === null ? '#475569' : diffPct >= 0 ? '#10b981' : '#ef4444' }}>
                {diffPct === null ? 'Inicio' : (diffPct >= 0 ? '+' : '') + diffPct.toFixed(2) + '%'}
              </td>
              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                <button onClick={() => onDelete(i)} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '3px 8px' }}>✕</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
