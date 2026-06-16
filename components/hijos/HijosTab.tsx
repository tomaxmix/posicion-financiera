'use client';

import { useState } from 'react';
import { Child, ChildFund, ChildAccount } from '@/lib/types';
import { fmt, fmt2, fmtPct, todayStr } from '@/lib/utils';
import { S } from '@/lib/styles';
import Modal from '@/components/shared/Modal';

interface Props { children: Child[]; onSave: (children: Child[]) => void; }

export default function HijosTab({ children, onSave }: Props) {
  const [active,   setActive]   = useState(children[0]?.id || '');
  const [modal,    setModal]    = useState<null | 'editCuentas' | 'editIndexa' | 'addAccount' | 'addFund'>(null);
  const [vals,     setVals]     = useState<Record<string, string>>({});
  const [newAcc,   setNewAcc]   = useState({ label: '', value: '', color: '#8b5cf6' });
  const [newFund,  setNewFund]  = useState({ isin: '', short: '', m: '', inv: '' });

  const child = children.find(c => c.id === active);
  if (!child) return null;

  const totalCuentas  = child.cuentas.reduce((s, c) => s + (c.value || 0), 0);
  const totalIndexa   = child.funds.reduce((s, f) => s + (f.m || 0), 0);
  const totalInvested = child.funds.reduce((s, f) => s + (f.inv || 0), 0);
  const totalLiq      = totalCuentas + totalIndexa;
  const totalReturn   = totalInvested > 0 ? (totalIndexa - totalInvested) / totalInvested * 100 : 0;

  const upd    = (k: string) => (v: string) => setVals(p => ({ ...p, [k]: v }));
  const update = (fn: (c: Child) => Child) => onSave(children.map(c => c.id === active ? fn(c) : c));

  const saveCuentas = () => {
    update(c => ({
      ...c,
      cuentas: c.cuentas.map(ct => ({ ...ct, value: parseFloat(vals['ct_' + ct.label]) || ct.value })),
    }));
    setModal(null);
  };

  const saveIndexa = () => {
    update(c => ({
      ...c,
      funds: c.funds.map(f => {
        const m   = parseFloat(vals['f_m_'   + f.id]) || f.m;
        const inv = parseFloat(vals['f_inv_' + f.id]) || f.inv;
        return { ...f, m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0 };
      }),
    }));
    setModal(null);
  };

  const addAccount = () => {
    if (!newAcc.label) return;
    const acc: ChildAccount = { label: newAcc.label, value: parseFloat(newAcc.value) || 0, color: newAcc.color };
    update(c => ({ ...c, cuentas: [...c.cuentas, acc] }));
    setNewAcc({ label: '', value: '', color: '#8b5cf6' }); setModal(null);
  };

  const addFund = () => {
    if (!newFund.short) return;
    const m = parseFloat(newFund.m) || 0, inv = parseFloat(newFund.inv) || 0;
    const f: ChildFund = { id: 'CF_' + Date.now(), isin: newFund.isin || newFund.short, short: newFund.short, type: 'RV', m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0 };
    update(c => ({ ...c, funds: [...c.funds, f] }));
    setNewFund({ isin: '', short: '', m: '', inv: '' }); setModal(null);
  };

  const removeFund    = (fid: string)   => update(c => ({ ...c, funds:   c.funds.filter(f => f.id !== fid) }));
  const removeAccount = (label: string) => update(c => ({ ...c, cuentas: c.cuentas.filter(ct => ct.label !== label) }));

  const childColor = active === 'simon' ? '#3b82f6' : '#10b981';

  return (
    <div>
      {/* ── Selector hijos + Snapshot ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {children.map(c => {
          const cc      = c.id === 'simon' ? '#3b82f6' : '#10b981';
          const isActive = active === c.id;
          const cTotal  = c.cuentas.reduce((s, x) => s + x.value, 0) + c.funds.reduce((s, f) => s + f.m, 0);
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setActive(c.id)} style={{
                padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: isActive ? cc : 'transparent',
                border: `1px solid ${isActive ? cc : '#1f2937'}`,
                color: isActive ? '#fff' : '#64748b',
                fontFamily: 'inherit',
              }}>
                {c.name}
                {cTotal > 0 && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.85 }}>{fmt(cTotal)} €</span>}
              </button>
              <button
                onClick={() => {
                  const cTot = c.cuentas.reduce((s, x) => s + x.value, 0);
                  const iTot = c.funds.reduce((s, f) => s + f.m, 0);
                  onSave(children.map(ch => ch.id !== c.id ? ch : {
                    ...ch,
                    history: [...ch.history, { date: todayStr(), cuentas: cTot, inv: iTot, patrimonio: cTot + iTot }],
                  }));
                }}
                title={`Snapshot de ${c.name}`}
                style={{ ...S.btn, padding: '7px 10px', fontSize: 13, color: '#64748b' }}
              >📌</button>
            </div>
          );
        })}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { lbl: 'Total',          val: fmt(totalLiq)      + ' €', color: '#f1f5f9', big: true  },
          { lbl: 'Imagine Bank',   val: fmt(totalCuentas)  + ' €', color: '#3b82f6', big: false },
          { lbl: 'Indexa Capital', val: fmt(totalIndexa)   + ' €', color: '#10b981', big: false },
        ].map(m => (
          <div key={m.lbl} style={{ ...S.cardSm, borderColor: m.big ? childColor : '#1f2937' }}>
            <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.lbl}</div>
            <div style={{ fontSize: m.big ? 22 : 17, fontWeight: 800, color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* ── Imagine Bank ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <div style={S.sec}>Imagine Bank</div>
            <button style={{ ...S.btn, fontSize: 11, padding: '5px 12px' }} onClick={() => {
              const v: Record<string, string> = {};
              child.cuentas.forEach(c => { v['ct_' + c.label] = String(c.value); });
              setVals(v); setModal('editCuentas');
            }}>↑ Actualizar</button>
          </div>
          {child.cuentas.map(c => (
            <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0f1e', borderRadius: 10, padding: '0.875rem 1rem', border: '1px solid #3b82f633', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{fmt(c.value)} €</div>
              </div>
              {child.cuentas.length > 1 && (
                <button onClick={() => removeAccount(c.label)} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '3px 7px' }}>✕</button>
              )}
            </div>
          ))}
          <button style={{ ...S.btn, fontSize: 11, width: '100%', textAlign: 'center', marginTop: 4 }}
            onClick={() => { setNewAcc({ label: '', value: '', color: '#8b5cf6' }); setModal('addAccount'); }}>
            + Añadir cuenta
          </button>
        </div>

        {/* ── Indexa Capital ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <div style={S.sec}>Indexa Capital</div>
            <button style={{ ...S.btn, fontSize: 11, padding: '5px 12px' }} onClick={() => {
              const v: Record<string, string> = {};
              child.funds.forEach(f => { v['f_m_' + f.id] = String(f.m); v['f_inv_' + f.id] = String(f.inv); });
              setVals(v); setModal('editIndexa');
            }}>↑ Actualizar</button>
          </div>

          {/* Resumen total */}
          <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '1rem', border: '1px solid #10b98133', marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Valor total</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{fmt(totalIndexa)} €</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Invertido</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>{fmt(totalInvested)} €</div>
              </div>
            </div>
            {totalInvested > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: Math.min(Math.abs(totalReturn) * 3, 100) + '%', background: totalReturn >= 0 ? '#10b981' : '#ef4444', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: totalReturn >= 0 ? '#10b981' : '#ef4444', flexShrink: 0 }}>
                  {fmtPct(totalReturn)}
                </div>
              </div>
            )}
          </div>

          {/* Fondos individuales */}
          {child.funds.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0f1e', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid #1f2937', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.short}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>{fmt(f.m)} €</span>
                  <span style={{ color: f.r >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{fmtPct(f.r)}</span>
                </div>
              </div>
              {child.funds.length > 1 && (
                <button onClick={() => removeFund(f.id)} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '3px 7px', marginLeft: 8, flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Añadir fondo (fuera de las cards) ── */}
      <div style={{ marginTop: '0.75rem' }}>
        <button style={{ ...S.btn, fontSize: 11 }}
          onClick={() => { setNewFund({ isin: '', short: '', m: '', inv: '' }); setModal('addFund'); }}>
          + Añadir fondo a {child.name}
        </button>
      </div>

      {/* ── MODALES ── */}
      {modal === 'editCuentas' && (
        <Modal title={`Actualizar Imagine Bank — ${child.name}`} onClose={() => setModal(null)}>
          {child.cuentas.map(c => (
            <div key={c.label} style={{ marginBottom: 14 }}>
              <label style={S.lbl}>{c.label} (€)</label>
              <input style={S.inp} type="number" step="0.01" value={vals['ct_' + c.label] || ''} onChange={e => upd('ct_' + c.label)(e.target.value)} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={saveCuentas}>Guardar</button>
          </div>
        </Modal>
      )}

      {modal === 'editIndexa' && (
        <Modal title={`Actualizar Indexa Capital — ${child.name}`} onClose={() => setModal(null)}>
          {child.funds.map(f => (
            <div key={f.id} style={{ background: '#0a0f1e', borderRadius: 10, padding: '1rem', border: '1px solid #1f2937', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>{f.short}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={S.lbl}>Valor actual (€)</label>
                  <input style={S.inp} type="number" step="0.01" value={vals['f_m_' + f.id] || ''} onChange={e => upd('f_m_' + f.id)(e.target.value)} />
                </div>
                <div>
                  <label style={S.lbl}>Invertido (€)</label>
                  <input style={S.inp} type="number" step="0.01" value={vals['f_inv_' + f.id] || ''} onChange={e => upd('f_inv_' + f.id)(e.target.value)} />
                </div>
              </div>
              {vals['f_m_' + f.id] && vals['f_inv_' + f.id] && parseFloat(vals['f_inv_' + f.id]) > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: (parseFloat(vals['f_m_' + f.id]) - parseFloat(vals['f_inv_' + f.id])) >= 0 ? '#10b981' : '#ef4444' }}>
                  {((parseFloat(vals['f_m_' + f.id]) - parseFloat(vals['f_inv_' + f.id])) / parseFloat(vals['f_inv_' + f.id]) * 100).toFixed(2)}%
                  {' · '}{fmt2(parseFloat(vals['f_m_' + f.id]) - parseFloat(vals['f_inv_' + f.id]))} €
                </div>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={saveIndexa}>Guardar</button>
          </div>
        </Modal>
      )}

      {modal === 'addAccount' && (
        <Modal title="Añadir cuenta" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}><label style={S.lbl}>Nombre</label><input style={S.inp} type="text" value={newAcc.label} onChange={e => setNewAcc(p => ({ ...p, label: e.target.value }))} /></div>
          <div style={{ marginBottom: 14 }}><label style={S.lbl}>Saldo (€)</label><input style={S.inp} type="number" step="0.01" value={newAcc.value} onChange={e => setNewAcc(p => ({ ...p, value: e.target.value }))} /></div>
          <div style={{ marginBottom: 14 }}><label style={S.lbl}>Color</label><input type="color" value={newAcc.color} onChange={e => setNewAcc(p => ({ ...p, color: e.target.value }))} style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #1f2937', background: '#0a0f1e', cursor: 'pointer' }} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnP} onClick={addAccount}>Añadir</button>
          </div>
        </Modal>
      )}

      {modal === 'addFund' && (
        <Modal title="Añadir fondo a Indexa" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}><label style={S.lbl}>Nombre *</label><input style={S.inp} type="text" placeholder="Ej: Vanguard Global Stk" value={newFund.short} onChange={e => setNewFund(p => ({ ...p, short: e.target.value }))} /></div>
          <div style={{ marginBottom: 14 }}><label style={S.lbl}>ISIN (opcional)</label><input style={S.inp} type="text" value={newFund.isin} onChange={e => setNewFund(p => ({ ...p, isin: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.lbl}>Valor actual (€)</label><input style={S.inp} type="number" step="0.01" value={newFund.m} onChange={e => setNewFund(p => ({ ...p, m: e.target.value }))} /></div>
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
