'use client';

import { useState, useEffect } from 'react';
import { Fund, FinancialData } from '@/lib/types';
import { TYPE_LABELS, todayStr } from '@/lib/utils';
import { S } from '@/lib/styles';
import Modal from '@/components/shared/Modal';

interface Props {
  modal: string | null;
  onClose: () => void;
  funds: Fund[];
  data: FinancialData;
  onSaveFunds: (f: Fund[]) => void;
  onSaveData: (d: FinancialData) => void;
  onAddFund: (f: Fund) => void;
}

/* ── Sub-componente: campo de formulario ── */
function Field({ label, value, onChange, type = 'number', step = '0.01' }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; step?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={S.lbl}>{label}</label>
      <input style={S.inp} type={type} step={step} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export default function ModalesGlobales({ modal, onClose, funds, data, onSaveFunds, onSaveData, onAddFund }: Props) {
  const [updVals, setUpdVals] = useState<Record<string, string>>({});
  const [newF, setNewF] = useState({ isin: '', short: '', type: 'RF' as Fund['type'], m: '', inv: '' });

  /* Poblar el formulario al abrir el modal */
  useEffect(() => {
    if (modal === 'patrimonio') {
      setUpdVals({
        arquia:        String(data.cuentas.arquia        || ''),
        caixabank:     String(data.cuentas.caixabank     || ''),
        traderepublic: String(data.cuentas.traderepublic || ''),
        myinvestor:    String(data.cuentas.myinvestor    || ''),
        valorPiso:     String(data.inmobiliario.valorPiso || ''),
        hipoteca:      String(data.deudas.hipoteca       || ''),
        coche:         String(data.deudas.coche          || ''),
      });
    }
    if (modal === 'inversiones') {
      const v: Record<string, string> = {};
      funds.forEach(f => { v[f.id + '_m'] = String(f.m || ''); v[f.id + '_inv'] = String(f.inv || ''); });
      setUpdVals(v);
    }
  }, [modal]); // eslint-disable-line

  const set = (k: string) => (v: string) => setUpdVals(p => ({ ...p, [k]: v }));

  const savePatrimonio = () => {
    const pv = (k: string) => parseFloat(updVals[k]?.replace(',', '.') || '0') || 0;
    onSaveData({
      cuentas:       { arquia: pv('arquia'), caixabank: pv('caixabank'), traderepublic: pv('traderepublic'), myinvestor: pv('myinvestor') },
      inmobiliario:  { valorPiso: pv('valorPiso') },
      deudas:        { hipoteca: pv('hipoteca'), coche: pv('coche') },
      lastUpd:       todayStr(),
    });
    onClose();
  };

  const saveInv = () => {
    const updated = funds.map(f => {
      const m   = updVals[f.id + '_m']   === '' ? f.m   : parseFloat(updVals[f.id + '_m'])   || 0;
      const inv = updVals[f.id + '_inv'] === '' ? f.inv : parseFloat(updVals[f.id + '_inv']) || 0;
      return { ...f, m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0 };
    });
    onSaveFunds(updated);
    onSaveData({ ...data, lastUpd: todayStr() });
    onClose();
  };

  const addFund = () => {
    if (!newF.isin || !newF.short) return;
    const m = parseFloat(newF.m) || 0, inv = parseFloat(newF.inv) || 0;
    onAddFund({ ...newF, id: 'F_' + Date.now(), m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0 });
    setNewF({ isin: '', short: '', type: 'RF', m: '', inv: '' });
    onClose();
  };

  if (!modal) return null;

  /* ── Modal Patrimonio ── */
  if (modal === 'patrimonio') return (
    <Modal title="Actualizar patrimonio" onClose={onClose}>
      <div style={S.sec}>Cuentas corrientes</div>
      <Field label="Arquia (€)"        value={updVals.arquia        ?? ''} onChange={set('arquia')} />
      <Field label="CaixaBank (€)"     value={updVals.caixabank     ?? ''} onChange={set('caixabank')} />
      <Field label="Trade Republic (€)"value={updVals.traderepublic ?? ''} onChange={set('traderepublic')} />
      <Field label="MyInvestor (€)"    value={updVals.myinvestor    ?? ''} onChange={set('myinvestor')} />
      <div style={S.div} />
      <div style={S.sec}>Inmobiliario</div>
      <Field label="Valor de mercado del piso (€)" step="1000" value={updVals.valorPiso ?? ''} onChange={set('valorPiso')} />
      <div style={S.div} />
      <div style={S.sec}>Deudas</div>
      <Field label="Hipoteca pendiente (€)" value={updVals.hipoteca ?? ''} onChange={set('hipoteca')} />
      <Field label="Préstamo coche (€)"     value={updVals.coche    ?? ''} onChange={set('coche')} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
        <button style={S.btn} onClick={onClose}>Cancelar</button>
        <button style={S.btnG} onClick={savePatrimonio}>Guardar</button>
      </div>
    </Modal>
  );

  /* ── Modal Inversiones ── */
  if (modal === 'inversiones') return (
    <Modal title="Actualizar inversiones" onClose={onClose}>
      {funds.map(f => (
        <div key={f.id} style={{ borderBottom: '1px solid #1f2937', padding: '10px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#e2e8f0' }}>{f.short}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={S.lbl}>Valor mercado (€)</label>
              <input style={S.inp} type="number" step="0.01" value={updVals[f.id + '_m'] ?? ''} onChange={e => setUpdVals(p => ({ ...p, [f.id + '_m']: e.target.value }))} />
            </div>
            <div>
              <label style={S.lbl}>Capital invertido (€)</label>
              <input style={S.inp} type="number" step="0.01" value={updVals[f.id + '_inv'] ?? ''} onChange={e => setUpdVals(p => ({ ...p, [f.id + '_inv']: e.target.value }))} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button style={S.btn} onClick={onClose}>Cancelar</button>
        <button style={S.btnG} onClick={saveInv}>Guardar todo</button>
      </div>
    </Modal>
  );

  /* ── Modal Añadir fondo ── */
  if (modal === 'add') return (
    <Modal title="Añadir nuevo fondo" onClose={onClose}>
      <Field label="ISIN *"        value={newF.isin}  onChange={v => setNewF(p => ({ ...p, isin: v }))}  type="text" step="" />
      <Field label="Nombre corto *"value={newF.short} onChange={v => setNewF(p => ({ ...p, short: v }))} type="text" step="" />
      <div style={{ marginBottom: 12 }}>
        <label style={S.lbl}>Tipo</label>
        <select style={S.inp} value={newF.type} onChange={e => setNewF(p => ({ ...p, type: e.target.value as Fund['type'] }))}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={S.lbl}>Valor mercado (€)</label>
          <input style={S.inp} type="number" step="0.01" value={newF.m} onChange={e => setNewF(p => ({ ...p, m: e.target.value }))} />
        </div>
        <div>
          <label style={S.lbl}>Capital invertido (€)</label>
          <input style={S.inp} type="number" step="0.01" value={newF.inv} onChange={e => setNewF(p => ({ ...p, inv: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
        <button style={S.btn} onClick={onClose}>Cancelar</button>
        <button style={S.btnP} onClick={addFund}>Añadir</button>
      </div>
    </Modal>
  );

  return null;
}
