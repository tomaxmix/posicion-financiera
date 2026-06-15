import { Fund } from '@/lib/types';
import { fmt2 } from '@/lib/utils';

export default function AllocBars({ funds }: { funds: Fund[] }) {
  const sum = (arr: Fund[]) => arr.reduce((s, f) => s + (f.m || 0), 0);
  const rf    = sum(funds.filter(f => f.type === 'RF' || f.type === 'MO'));
  const rvEtf = sum(funds.filter(f => f.type === 'RV' || f.type === 'ETF'));
  const etf   = sum(funds.filter(f => f.type === 'ETF'));
  const pp    = sum(funds.filter(f => f.type === 'PP'));
  const ac    = sum(funds.filter(f => f.type === 'AC'));
  const tm    = sum(funds) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        { label: 'Renta Fija',             val: rf,    pct: rf / tm * 100,    color: '#3b82f6', note: null },
        { label: 'Renta Variable + ETFs',  val: rvEtf, pct: rvEtf / tm * 100, color: '#10b981', note: rvEtf > 0 ? `De los cuales, ${(etf / rvEtf * 100).toFixed(1)}% son ETFs` : null },
        { label: 'Plan Pensiones',         val: pp,    pct: pp / tm * 100,    color: '#8b5cf6', note: null },
        { label: 'Acciones',               val: ac,    pct: ac / tm * 100,    color: '#ef4444', note: null },
      ].filter(r => r.val > 0).map(r => (
        <div key={r.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: '#64748b' }}>{r.label}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt2(r.val)} € · {r.pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: r.pct + '%', background: r.color, borderRadius: 3 }} />
          </div>
          {r.note && <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>↳ {r.note}</div>}
        </div>
      ))}
    </div>
  );
}
