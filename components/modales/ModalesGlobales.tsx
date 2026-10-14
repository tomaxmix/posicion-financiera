'use client';

import { useState, useEffect } from 'react';
import { Fund, FinancialData, Broker } from '@/lib/types';
import { TYPE_LABELS, BROKER_LABELS, todayStr, todayISO } from '@/lib/utils';
import { SUGGESTED_BROKERS } from '@/lib/defaults';
import { markManual } from '@/lib/pricing';
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

/* ── Sub-componente: desplegable de banco ('' = sin asignar) ── */
function BrokerSelect({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <select style={{ ...S.inp, ...style }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— sin asignar —</option>
      {Object.entries(BROKER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

/* Guarda el banco en el fondo, o lo quita si queda sin asignar (Firestore no admite undefined) */
function withBroker<T extends Fund>(f: T, broker: string): T {
  const copy = { ...f };
  if (broker) copy.broker = broker as Broker;
  else delete copy.broker;
  return copy;
}

export default function ModalesGlobales({ modal, onClose, funds, data, onSaveFunds, onSaveData, onAddFund }: Props) {
  const [updVals, setUpdVals] = useState<Record<string, string>>({});
  const [newF, setNewF] = useState({ isin: '', short: '', type: 'RF' as Fund['type'], m: '', inv: '', broker: '' });

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
      funds.forEach(f => {
        v[f.id + '_m']   = String(f.m || '');
        v[f.id + '_inv'] = String(f.inv || '');
        // Banco guardado o, si aún no tiene, la sugerencia (se guarda al pulsar "Guardar todo")
        v[f.id + '_broker'] = f.broker ?? SUGGESTED_BROKERS[f.isin] ?? '';
      });
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
      // Si cambia el valor, manda el dato manual: se borra el precio de referencia
      const base = m !== f.m ? markManual(f, todayISO()) : f;
      return withBroker({ ...base, m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0 }, updVals[f.id + '_broker'] ?? '');
    });
    onSaveFunds(updated);
    onSaveData({ ...data, lastUpd: todayStr() });
    onClose();
  };

  const addFund = () => {
    if (!newF.isin || !newF.short) return;
    const m = parseFloat(newF.m) || 0, inv = parseFloat(newF.inv) || 0;
    const fund: Fund = { id: 'F_' + Date.now(), isin: newF.isin, short: newF.short, type: newF.type, m, inv, r: inv > 0 ? (m - inv) / inv * 100 : 0, priceSource: 'manual', lastPriceDate: todayISO() };
    onAddFund(withBroker(fund, newF.broker));
    setNewF({ isin: '', short: '', type: 'RF', m: '', inv: '', broker: '' });
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{f.short}</div>
            <BrokerSelect value={updVals[f.id + '_broker'] ?? ''} onChange={set(f.id + '_broker')}
              style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }} />
          </div>
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
      <div style={{ marginBottom: 12 }}>
        <label style={S.lbl}>Dónde lo tienes</label>
        <BrokerSelect value={newF.broker} onChange={v => setNewF(p => ({ ...p, broker: v }))} />
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
