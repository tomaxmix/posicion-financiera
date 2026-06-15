'use client';

import { useState } from 'react';
import { Child, ChildFund, ChildAccount } from '@/lib/types';
import { fmt, fmt2, fmtPct, todayStr } from '@/lib/utils';
import { S, subTabBtn, thStyle, tdStyle, trStyle } from '@/lib/styles';
import Modal from '@/components/shared/Modal';

interface Props { children: Child[]; onSave: (children: Child[]) => void; }

export default function HijosTab({ children, onSave }: Props) {
  const [active, setActive] = useState(children[0]?.id || '');
  const [modal, setModal]   = useState<null | 'edit' | 'addFund' | 'addAccount'>(null);
  const [vals,  setVals]    = useState<Record<string, string>>({});
  const [newFund, setNewFund] = useState({ isin: '', short: '', type: 'RV', m: '', inv: '' });

  const child = children.find(c => c.id === active);
  if (!child) return <div style={{ color: '#475569', textAlign: 'center', padding: '3rem', fontSize: 13 }}>Sin perfiles configurados.</div>;

  const totalInv     = child.funds.reduce((s, f) => s + (f.m || 0), 0);
  const totalCuentas = child.cuentas.reduce((s, c) => s + (c.value || 0), 0);
  const totalLiq     = totalInv + totalCuentas;
  const progressPct  = child.objetivo ? Math.min(totalLiq / child.objetivo * 100, 100) : 0;

  const upd = (k: string) => (v: string) => setVals(p => ({ ...p, [k]: v }));

  const saveEdit = () => {
    const updated = children.map(c => {
      if (c.id !== active) return c;
      return {
        ...c,
        objetivo:      parseFloat(vals.objetivo)      || c.objetivo,
        objetivoLabel: vals.objetivoLabel              || c.objetivoLabel,
        cuentas: c.cuentas.map(ct => ({
          ...ct,
          value: parseFloat(vals['ct_' + ct.label]) ?? ct.value,
        })),
      };
    });
    onSave(updated); setModal(null);
  };

  const addAccount = () => {
    if (!vals.accLabel) return;
    const acc: ChildAccount = { label: vals.accLabel, value: parseFloat(vals.accValue) || 0, color: vals.accColor || '#3b82f6' };
    onSave(children.map(c => c.id === active ? { ...c, cuentas: [...c.cuentas, acc] } : c));
    setVals({}); setModal(null);
  };

  const addFund = () => {
    if (!newFund.isin || !newFund.short) return;
    const m = parseFloat(newFund.m) || 0, inv = parseFloat(newFund.inv) || 0;
    const f: ChildFund = { id: 'CF_' + Date.now(), isin: newFund.isin, short: newFund.short, type: newFund.type, m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0 };
    onSave(children.map(c => c.id === active ? { ...c, funds: [...c.funds, f] } : c));
    setNewFund({ isin: '', short: '', type: 'RV', m: '', inv: '' }); setModal(null);
  };

  const removeFund = (fid: string) => onSave(children.map(c => c.id === active ? { ...c, funds: c.funds.filter(f => f.id !== fid) } : c));

  const snapshot = () => {
    const today = todayStr();
    onSave(children.map(c => c.id !== active ? c : {
      ...c, history: [...c.history, { date: today, inv: totalInv, cuentas: totalCuentas, patrimonio: totalLiq }],
    }));
  };

  return (
    <div>
      {/* Selector de hijo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {children.map(c => (
          <button key={c.id} onClick={() => setActive(c.id)} style={{
            padding: '8px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: active === c.id ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'transparent',
            border: active === c.id ? 'none' : '1px solid #1f2937',
            color: active === c.id ? '#fff' : '#64748b',
          }}>{c.name}</button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { lbl: 'Total líquido',  val: fmt(totalLiq)     + ' €', color: '#f1f5f9' },
          { lbl: 'Inversiones',    val: fmt(totalInv)     + ' €', color: '#10b981' },
          { lbl: 'Cuentas',        val: fmt(totalCuentas) + ' €', color: '#3b82f6' },
          { lbl: 'Objetivo',       val: child.objetivo ? fmt(child.objetivo) + ' €' : '—', color: '#f59e0b' },
        ].map(m => (
          <div key={m.lbl} style={S.cardSm}>
            <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.lbl}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Progreso objetivo */}
      {child.objetivo && (
        <div style={{ ...S.card, marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={S.sec}>{child.objetivoLabel || 'Objetivo'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{progressPct.toFixed(1)}%</div>
          </div>
          <div style={{ height: 10, background: '#1e293b', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: progressPct + '%', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: 5, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
            <span>{fmt(totalLiq)} € acumulados</span>
            <span>{fmt((child.objetivo || 0) - totalLiq)} € restantes</span>
          </div>
        </div>
      )}

      {/* Cuentas */}
      <div style={{ ...S.card, marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={S.sec}>Cuentas</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={S.btn} onClick={() => { setVals({}); setModal('addAccount'); }}>+ Cuenta</button>
            <button style={S.btn} onClick={() => {
              const v: Record<string, string> = { objetivo: String(child.objetivo || ''), objetivoLabel: child.objetivoLabel || '' };
              child.cuentas.forEach(c => { v['ct_' + c.label] = String(c.value); });
              setVals(v); setModal('edit');
            }}>↑ Actualizar</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
          {child.cuentas.map(c => (
            <div key={c.label} style={{ background: '#0a0f1e', borderRadius: 10, padding: '0.85rem 1rem', border: `1px solid ${c.color}33` }}>
              <div style={{ fontSize: 10, color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{fmt(c.value)} €</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fondos */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={S.sec}>Fondos de inversión</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={S.btn} onClick={() => setModal('addFund')}>+ Fondo</button>
            <button style={S.btn} onClick={snapshot}>📌 Snapshot</button>
          </div>
        </div>
        {child.funds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: 13 }}>Sin fondos todavía. Añade el primero.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{['Fondo', 'Valor', 'Invertido', '+/- %', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {child.funds.map(f => (
                  <tr key={f.id} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{f.short}</div>
                      <div style={{ fontSize: 10, color: '#334155' }}>{f.isin}</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt2(f.m)} €</td>
                    <td style={{ ...tdStyle, color: '#64748b' }}>{fmt2(f.inv)} €</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: f.r >= 0 ? '#10b981' : '#ef4444' }}>{fmtPct(f.r)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => removeFund(f.id)} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '3px 8px' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal editar */}
      {modal === 'edit' && (
        <Modal title={`Actualizar datos de ${child.name}`} onClose={() => setModal(null)}>
          <div style={S.sec}>Objetivo</div>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>Objetivo (€)</label><input style={S.inp} type="number" value={vals.objetivo || ''} onChange={e => upd('objetivo')(e.target.value)} /></div>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>Descripción</label><input style={S.inp} type="text" value={vals.objetivoLabel || ''} onChange={e => upd('objetivoLabel')(e.target.value)} /></div>
          <div style={S.div} />
          <div style={S.sec}>Saldos</div>
          {child.cuentas.map(c => (
            <div key={c.label} style={{ marginBottom: 12 }}>
              <label style={S.lbl}>{c.label} (€)</label>
              <input style={S.inp} type="number" step="0.01" value={vals['ct_' + c.label] || ''} onChange={e => upd('ct_' + c.label)(e.target.value)} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={saveEdit}>Guardar</button>
          </div>
        </Modal>
      )}

      {modal === 'addAccount' && (
        <Modal title="Añadir cuenta" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>Nombre (ej: Indexa Capital)</label><input style={S.inp} type="text" value={vals.accLabel || ''} onChange={e => upd('accLabel')(e.target.value)} /></div>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>Saldo (€)</label><input style={S.inp} type="number" step="0.01" value={vals.accValue || ''} onChange={e => upd('accValue')(e.target.value)} /></div>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>Color</label><input type="color" value={vals.accColor || '#3b82f6'} onChange={e => upd('accColor')(e.target.value)} style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #1f2937', background: '#0a0f1e', cursor: 'pointer' }} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnP} onClick={addAccount}>Añadir</button>
          </div>
        </Modal>
      )}

      {modal === 'addFund' && (
        <Modal title={`Añadir fondo a ${child.name}`} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>ISIN *</label><input style={S.inp} type="text" value={newFund.isin} onChange={e => setNewFund(p => ({ ...p, isin: e.target.value }))} /></div>
          <div style={{ marginBottom: 12 }}><label style={S.lbl}>Nombre *</label><input style={S.inp} type="text" value={newFund.short} onChange={e => setNewFund(p => ({ ...p, short: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={S.lbl}>Valor mercado (€)</label><input style={S.inp} type="number" step="0.01" value={newFund.m} onChange={e => setNewFund(p => ({ ...p, m: e.target.value }))} /></div>
            <div><label style={S.lbl}>Capital invertido (€)</label><input style={S.inp} type="number" step="0.01" value={newFund.inv} onChange={e => setNewFund(p => ({ ...p, inv: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnP} onClick={addFund}>Añadir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
