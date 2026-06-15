'use client';

import { useState } from 'react';
import { Operation, Alert, Fund, RecurringContribution } from '@/lib/types';
import { fmt2, todayStr } from '@/lib/utils';
import { S, subTabBtn, thStyle, tdStyle, trStyle } from '@/lib/styles';
import Modal from '@/components/shared/Modal';

interface Props {
  operations:  Operation[];
  alerts:      Alert[];
  funds:       Fund[];
  recurring:   RecurringContribution[];
  onSaveOps:   (ops: Operation[]) => void;
  onSaveAlerts:(alerts: Alert[]) => void;
  onSaveRecurring:(r: RecurringContribution[]) => void;
}

const TYPE_COLOR: Record<string, string> = { compra: '#10b981', venta: '#ef4444', traspaso: '#3b82f6' };
const TYPE_LABEL: Record<string, string> = { compra: '↑ Compra', venta: '↓ Venta', traspaso: '⇄ Traspaso' };

export default function OperativaTab({ operations, alerts, funds, recurring, onSaveOps, onSaveAlerts, onSaveRecurring }: Props) {
  const [sub,   setSub]   = useState<'ops' | 'alertas' | 'sim' | 'programadas'>('ops');
  const [modal, setModal] = useState<null | 'addOp' | 'addAlert' | 'addRecurring'>(null);

  /* ── Estado formulario operación ── */
  const [newOp, setNewOp] = useState<Partial<Operation>>({ type: 'compra', date: todayStr() });
  const [fromCustom, setFromCustom] = useState('');
  const [toCustom,   setToCustom]   = useState('');

  /* ── Estado formulario alerta ── */
  const [newAlert, setNewAlert] = useState({ fundId: '', threshold: '5' });

  /* ── Estado formulario aportación programada ── */
  const [newR, setNewR] = useState({ fundId: '', amount: '', dayOfMonth: '10' });

  /* ── Simulador ── */
  const [sim, setSim]           = useState({ fromId: '', toId: '', amount: '' });
  const [simResult, setSimResult] = useState<string | null>(null);

  /* ── Helpers ── */
  const fundName = (id: string) => funds.find(f => f.id === id)?.short || id;

  const addOp = () => {
    if (!newOp.amount) return;
    const from = newOp.type === 'traspaso'
      ? (newOp.fundFrom === '__custom' ? fromCustom : (newOp.fundFrom ? fundName(newOp.fundFrom) : ''))
      : undefined;
    const to = newOp.type === 'traspaso'
      ? (newOp.fundTo === '__custom' ? toCustom : (newOp.fundTo ? fundName(newOp.fundTo) : ''))
      : (newOp.fundTo === '__custom' ? toCustom : (newOp.fundTo ? fundName(newOp.fundTo) : ''));

    onSaveOps([{
      id: 'OP_' + Date.now(),
      date: newOp.date || todayStr(),
      type: newOp.type as Operation['type'],
      fundFrom: from,
      fundTo:   to,
      amount:   parseFloat(String(newOp.amount)) || 0,
      notes:    newOp.notes,
    }, ...operations]);
    setNewOp({ type: 'compra', date: todayStr() });
    setFromCustom(''); setToCustom('');
    setModal(null);
  };

  const addAlert = () => {
    const fund = funds.find(f => f.id === newAlert.fundId);
    if (!fund) return;
    onSaveAlerts([...alerts, { id: 'AL_' + Date.now(), fundId: fund.id, fundName: fund.short, threshold: parseFloat(newAlert.threshold) || 5, active: true }]);
    setNewAlert({ fundId: '', threshold: '5' }); setModal(null);
  };

  const addRecurring = () => {
    const fund = funds.find(f => f.id === newR.fundId);
    if (!fund || !newR.amount) return;
    onSaveRecurring([...recurring, {
      id: 'R_' + Date.now(), fundId: fund.id, fundName: fund.short,
      amount: parseFloat(newR.amount) || 0, dayOfMonth: parseInt(newR.dayOfMonth) || 10,
      active: true,
    }]);
    setNewR({ fundId: '', amount: '', dayOfMonth: '10' }); setModal(null);
  };

  const runSim = () => {
    const from = funds.find(f => f.id === sim.fromId);
    const to   = funds.find(f => f.id === sim.toId);
    const amt  = parseFloat(sim.amount) || 0;
    if (!from || !to || !amt) { setSimResult('Rellena todos los campos.'); return; }
    if (amt > from.m) { setSimResult(`⚠️ Saldo insuficiente en ${from.short} (${fmt2(from.m)} €).`); return; }
    const newFromPl = (from.m - amt) - from.inv;
    const newToPl   = (to.m + amt)  - to.inv;
    setSimResult(
      `📊 Resultado del traspaso de ${fmt2(amt)} € de ${from.short} → ${to.short}\n\n` +
      `• ${from.short}: ${fmt2(from.m)} € → ${fmt2(from.m - amt)} €   (plusvalía: ${newFromPl >= 0 ? '+' : ''}${fmt2(newFromPl)} €)\n` +
      `• ${to.short}: ${fmt2(to.m)} € → ${fmt2(to.m + amt)} €   (plusvalía estimada: ${newToPl >= 0 ? '+' : ''}${fmt2(newToPl)} €)\n\n` +
      `ℹ️ Los traspasos entre fondos de inversión son fiscalmente neutros en España — no tributan en IRPF hasta que vendas.`
    );
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={S.subTabs}>
        {[['ops','Historial'],['alertas','Alertas'],['sim','Simulador'],['programadas','Aportaciones']].map(([k,v]) => (
          <button key={k} onClick={() => setSub(k as any)} style={subTabBtn(sub === k)}>{v}</button>
        ))}
      </div>

      {/* ── HISTORIAL ── */}
      {sub === 'ops' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={S.sec}>Historial de operaciones</div>
            <button style={S.btnG} onClick={() => setModal('addOp')}>+ Registrar operación</button>
          </div>
          {operations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: 13 }}>Sin operaciones. Registra compras, ventas o traspasos.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Fecha','Tipo','Fondo/s','Importe','Notas',''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {operations.map(op => (
                    <tr key={op.id} style={trStyle}>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{op.date}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: TYPE_COLOR[op.type] }}>{TYPE_LABEL[op.type]}</td>
                      <td style={tdStyle}>{op.type === 'traspaso' ? `${op.fundFrom} → ${op.fundTo}` : (op.fundTo || op.fundFrom || '—')}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt2(op.amount)} €</td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{op.notes || '—'}</td>
                      <td style={tdStyle}>
                        <button onClick={() => onSaveOps(operations.filter(o => o.id !== op.id))} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '3px 8px' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ALERTAS ── */}
      {sub === 'alertas' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={S.sec}>Alertas de caída</div>
            <button style={S.btnP} onClick={() => setModal('addAlert')}>+ Nueva alerta</button>
          </div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: 13 }}>Sin alertas. Crea una para recibir aviso cuando un fondo caiga más de X%.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0f1e', borderRadius: 10, padding: '0.9rem 1rem', border: '1px solid #1f2937' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{a.fundName}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Alerta si cae más de <span style={{ color: '#ef4444', fontWeight: 700 }}>{a.threshold}%</span> en el mes</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => onSaveAlerts(alerts.map(x => x.id === a.id ? { ...x, active: !x.active } : x))} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: a.active ? '#064e3b' : '#1e293b', border: a.active ? '1px solid #065f46' : '1px solid #334155', color: a.active ? '#10b981' : '#64748b' }}>{a.active ? 'Activa' : 'Inactiva'}</button>
                    <button onClick={() => onSaveAlerts(alerts.filter(x => x.id !== a.id))} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SIMULADOR ── */}
      {sub === 'sim' && (
        <div style={S.card}>
          <div style={S.sec}>Simulador de traspaso</div>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: '1.25rem', lineHeight: 1.6 }}>Visualiza el impacto antes de ejecutarlo. Los traspasos entre fondos son fiscalmente neutros en España.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: '1rem' }}>
            <div>
              <label style={S.lbl}>Fondo origen</label>
              <select style={S.inp} value={sim.fromId} onChange={e => setSim(p => ({ ...p, fromId: e.target.value }))}>
                <option value="">Seleccionar…</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.short} ({fmt2(f.m)} €)</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Fondo destino</label>
              <select style={S.inp} value={sim.toId} onChange={e => setSim(p => ({ ...p, toId: e.target.value }))}>
                <option value="">Seleccionar…</option>
                {funds.filter(f => f.id !== sim.fromId).map(f => <option key={f.id} value={f.id}>{f.short}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Importe (€)</label>
              <input style={S.inp} type="number" step="100" value={sim.amount} onChange={e => setSim(p => ({ ...p, amount: e.target.value }))} />
            </div>
          </div>
          <button style={S.btnG} onClick={runSim}>Simular traspaso</button>
          {simResult && (
            <div style={{ marginTop: '1rem', background: '#0a0f1e', border: '1px solid #1e3a5f', borderRadius: 10, padding: '1rem 1.1rem', fontSize: 13, color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {simResult}
            </div>
          )}
        </div>
      )}

      {/* ── APORTACIONES PROGRAMADAS ── */}
      {sub === 'programadas' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={S.sec}>Aportaciones mensuales programadas</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: -6 }}>La app te avisa cada mes cuando corresponde hacer la aportación</div>
            </div>
            <button style={S.btnG} onClick={() => setModal('addRecurring')}>+ Nueva aportación</button>
          </div>

          {recurring.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: 13 }}>
              Sin aportaciones programadas.<br />Añade las aportaciones mensuales fijas para que la app te recuerde registrarlas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recurring.map(r => {
                const today    = new Date();
                const monthKey = `${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
                const done     = r.lastRegistered === monthKey;
                return (
                  <RecurringRow
                    key={r.id} r={r} done={done}
                    onUpdate={updated => onSaveRecurring(recurring.map(x => x.id === r.id ? updated : x))}
                    onDelete={() => onSaveRecurring(recurring.filter(x => x.id !== r.id))}
                  />
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '1.25rem', background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
              💡 <strong style={{ color: '#94a3b8' }}>Cómo funciona:</strong> Cada mes a partir del día programado, aparecerá un aviso en la parte superior del dashboard para confirmar cada aportación con un clic. Al confirmar, se suma al capital invertido del fondo y se registra en el historial de operaciones.
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: registrar operación ── */}
      {modal === 'addOp' && (
        <Modal title="Registrar operación" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Tipo de operación</label>
            <select style={S.inp} value={newOp.type} onChange={e => setNewOp(p => ({ ...p, type: e.target.value as Operation['type'] }))}>
              <option value="compra">↑ Compra</option>
              <option value="venta">↓ Venta</option>
              <option value="traspaso">⇄ Traspaso</option>
            </select>
          </div>

          {newOp.type === 'traspaso' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <FundSelect label="Fondo origen" value={newOp.fundFrom || ''} onChange={v => setNewOp(p => ({ ...p, fundFrom: v }))} />
                <FundSelect label="Fondo destino" value={newOp.fundTo || ''} onChange={v => setNewOp(p => ({ ...p, fundTo: v }))} exclude={newOp.fundFrom} />
              </div>
              {newOp.fundFrom === '__custom' && (
                <div style={{ marginBottom: 14 }}><label style={S.lbl}>Nombre fondo origen</label><input style={S.inp} type="text" value={fromCustom} onChange={e => setFromCustom(e.target.value)} placeholder="Nombre del fondo..." /></div>
              )}
              {newOp.fundTo === '__custom' && (
                <div style={{ marginBottom: 14 }}><label style={S.lbl}>Nombre fondo destino</label><input style={S.inp} type="text" value={toCustom} onChange={e => setToCustom(e.target.value)} placeholder="Nombre del fondo..." /></div>
              )}
            </>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <FundSelect label="Fondo" value={newOp.fundTo || ''} onChange={v => setNewOp(p => ({ ...p, fundTo: v }))} />
              {newOp.fundTo === '__custom' && (
                <div style={{ marginTop: 10 }}><label style={S.lbl}>Nombre del fondo</label><input style={S.inp} type="text" value={toCustom} onChange={e => setToCustom(e.target.value)} placeholder="Nombre del fondo..." /></div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={S.lbl}>Importe (€)</label><input style={S.inp} type="number" step="0.01" value={newOp.amount || ''} onChange={e => setNewOp(p => ({ ...p, amount: parseFloat(e.target.value) }))} /></div>
            <div><label style={S.lbl}>Fecha</label><input style={S.inp} type="text" placeholder="DD/MM/AAAA" value={newOp.date || ''} onChange={e => setNewOp(p => ({ ...p, date: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={S.lbl}>Notas (opcional)</label><input style={S.inp} type="text" value={newOp.notes || ''} onChange={e => setNewOp(p => ({ ...p, notes: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={addOp}>Registrar</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: nueva alerta ── */}
      {modal === 'addAlert' && (
        <Modal title="Nueva alerta de caída" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Fondo</label>
            <select style={S.inp} value={newAlert.fundId} onChange={e => setNewAlert(p => ({ ...p, fundId: e.target.value }))}>
              <option value="">Seleccionar fondo…</option>
              {funds.map(f => <option key={f.id} value={f.id}>{f.short}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Alertar si cae más de (%) en el mes</label>
            <input style={S.inp} type="number" step="0.5" min="0.5" max="50" value={newAlert.threshold} onChange={e => setNewAlert(p => ({ ...p, threshold: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnP} onClick={addAlert}>Crear alerta</button>
          </div>
        </Modal>
      )}

      {/* ── Modal: nueva aportación programada ── */}
      {modal === 'addRecurring' && (
        <Modal title="Nueva aportación mensual" onClose={() => setModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Fondo</label>
            <select style={S.inp} value={newR.fundId} onChange={e => setNewR(p => ({ ...p, fundId: e.target.value }))}>
              <option value="">Seleccionar fondo…</option>
              {funds.map(f => <option key={f.id} value={f.id}>{f.short}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={S.lbl}>Importe mensual (€)</label><input style={S.inp} type="number" step="50" value={newR.amount} onChange={e => setNewR(p => ({ ...p, amount: e.target.value }))} /></div>
            <div><label style={S.lbl}>Día del mes</label><input style={S.inp} type="number" min="1" max="28" value={newR.dayOfMonth} onChange={e => setNewR(p => ({ ...p, dayOfMonth: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button style={S.btn} onClick={() => setModal(null)}>Cancelar</button>
            <button style={S.btnG} onClick={addRecurring}>Crear aportación</button>
          </div>
        </Modal>
      )}
    </div>
  );

  /* ── Fila editable de aportación programada ── */
  function RecurringRow({ r, done, onUpdate, onDelete }: {
    r: RecurringContribution; done: boolean;
    onUpdate: (updated: RecurringContribution) => void;
    onDelete: () => void;
  }) {
    const [editing, setEditing] = useState(false);
    const [amt, setAmt]         = useState(String(r.amount));
    const [day, setDay]         = useState(String(r.dayOfMonth));

    const save = () => {
      onUpdate({ ...r, amount: parseFloat(amt) || 0, dayOfMonth: parseInt(day) || 10 });
      setEditing(false);
    };

    return (
      <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '0.9rem 1.1rem', border: `1px solid ${done ? '#064e3b' : '#1f2937'}` }}>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ ...S.lbl, marginBottom: 3 }}>Importe (€)</label>
              <input style={{ ...S.inp, padding: '6px 10px', fontSize: 13 }} type="number" step="50" value={amt} onChange={e => setAmt(e.target.value)} autoFocus />
            </div>
            <div style={{ width: 80 }}>
              <label style={{ ...S.lbl, marginBottom: 3 }}>Día</label>
              <input style={{ ...S.inp, padding: '6px 10px', fontSize: 13 }} type="number" min="1" max="28" value={day} onChange={e => setDay(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, paddingTop: 18 }}>
              <button onClick={save} style={{ ...S.btnG, padding: '6px 14px' }}>Guardar</button>
              <button onClick={() => setEditing(false)} style={{ ...S.btn, padding: '6px 12px' }}>✕</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{r.fundName}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                <span style={{ color: r.amount > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  {r.amount > 0 ? fmt2(r.amount) + ' €' : '⚠️ Sin importe'}
                </span>
                {' · día '}{r.dayOfMonth}{' de cada mes'}
                {done && <span style={{ color: '#10b981', marginLeft: 10 }}>✓ Registrada este mes</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <button onClick={() => setEditing(true)} style={{ ...S.btn, padding: '4px 12px', fontSize: 11 }}>✏️ Editar</button>
              <button onClick={() => onUpdate({ ...r, active: !r.active })} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: r.active ? '#064e3b' : '#1e293b', border: r.active ? '1px solid #065f46' : '1px solid #334155', color: r.active ? '#10b981' : '#64748b' }}>{r.active ? 'Activa' : 'Pausada'}</button>
              <button onClick={onDelete} style={{ background: 'none', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>✕</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Componente interno selector de fondo ── */
  function FundSelect({ label, value, onChange, exclude }: { label: string; value: string; onChange: (v: string) => void; exclude?: string }) {
    return (
      <div>
        <label style={S.lbl}>{label}</label>
        <select style={S.inp} value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Seleccionar fondo…</option>
          {funds.filter(f => f.id !== exclude).map(f => (
            <option key={f.id} value={f.id}>{f.short}</option>
          ))}
          <option value="__custom">✏️ Nuevo fondo (escribir)</option>
        </select>
      </div>
    );
  }
}
