'use client';

import { RecurringContribution, Fund, Operation } from '@/lib/types';
import { fmt2, todayStr } from '@/lib/utils';

interface Props {
  recurring:  RecurringContribution[];
  funds:      Fund[];
  onConfirm:  (contrib: RecurringContribution, newFunds: Fund[], newOps: Operation[]) => void;
  onSkip:     (contrib: RecurringContribution) => void;
  operations: Operation[];
}

export default function AportacionesBanner({ recurring, funds, onConfirm, onSkip, operations }: Props) {
  const today    = new Date();
  const monthKey = `${String(today.getMonth() + 1).padStart(2,'0')}/${today.getFullYear()}`;
  const dayOk    = today.getDate() >= 10;

  const pendientes = recurring.filter(r =>
    r.active &&
    r.amount > 0 &&
    dayOk &&
    r.lastRegistered !== monthKey
  );

  if (pendientes.length === 0) return null;

  const handleConfirm = (r: RecurringContribution) => {
    const fund = funds.find(f => f.id === r.fundId);
    if (!fund) return;

    const newFunds = funds.map(f =>
      f.id === r.fundId
        ? { ...f, inv: f.inv + r.amount, m: f.m + r.amount, r: ((f.m + r.amount) - (f.inv + r.amount)) / (f.inv + r.amount) * 100 }
        : f
    );
    const newOp: Operation = {
      id: 'OP_' + Date.now(),
      date: todayStr(),
      type: 'compra',
      fundTo: fund.short,
      amount: r.amount,
      notes: `Aportación mensual programada (${monthKey})`,
    };
    onConfirm({ ...r, lastRegistered: monthKey }, newFunds, [newOp, ...operations]);
  };

  const handleSkip = (r: RecurringContribution) => {
    // Marca como "gestionada este mes" sin modificar el capital invertido
    onSkip({ ...r, lastRegistered: monthKey });
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)', border: '1px solid #10b98133', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>📅</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#d1fae5' }}>Aportaciones mensuales pendientes</div>
          <div style={{ fontSize: 11, color: '#6ee7b7' }}>
            Es día {today.getDate()} — tienes {pendientes.length} aportación{pendientes.length > 1 ? 'es' : ''} programada{pendientes.length > 1 ? 's' : ''} para este mes
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendientes.map(r => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px' }}>
            <div>
              <span style={{ fontSize: 13, color: '#ecfdf5', fontWeight: 600 }}>{r.fundName}</span>
              <span style={{ fontSize: 12, color: '#6ee7b7', marginLeft: 10 }}>{fmt2(r.amount)} €/mes</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handleSkip(r)}
                style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #6ee7b733', borderRadius: 7, background: 'transparent', color: '#6ee7b7', cursor: 'pointer', fontWeight: 500 }}
              >
                Saltar este mes
              </button>
              <button
                onClick={() => handleConfirm(r)}
                style={{ fontSize: 12, padding: '5px 14px', border: 'none', borderRadius: 7, background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
