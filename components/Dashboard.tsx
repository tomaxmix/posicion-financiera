'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { todayStr } from '@/lib/utils';
import { Operation, RecurringContribution } from '@/lib/types';
import PatrimonioTab    from './patrimonio/PatrimonioTab';
import InversionesTab   from './inversiones/InversionesTab';
import EvolucionTab     from './evolucion/EvolucionTab';
import NoticiasTab      from './noticias/NoticiasTab';
import HijosTab         from './hijos/HijosTab';
import OperativaTab     from './operativa/OperativaTab';
import ModalesGlobales  from './modales/ModalesGlobales';
import AportacionesBanner from './shared/AportacionesBanner';

const TABS = [
  { id: 'patrimonio',  label: 'Patrimonio'  },
  { id: 'inversiones', label: 'Inversiones' },
  { id: 'evolucion',   label: 'Evolución'   },
  { id: 'noticias',    label: 'Noticias & IA'},
  { id: 'hijos',       label: 'Hijos'       },
  { id: 'operativa',   label: 'Operativa'   },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const {
    funds, setFunds, data, setData,
    history, setHistory, children, setChildren,
    operations, setOperations, alerts, setAlerts,
    watchlist, setWatchlist, recurring, setRecurring, loaded,
  } = useUserData();

  const [tab,            setTab]           = useState('patrimonio');
  const [modal,          setModal]         = useState<string | null>(null);
  const [updatingPrices, setUpdatingPrices]= useState(false);
  const [priceMsg,       setPriceMsg]      = useState<string | null>(null);

  const invTotal      = funds.reduce((s, f) => s + (f.m || 0), 0);
  const cuentasTotal  = Object.values(data.cuentas).reduce((s, v) => s + (v || 0), 0);
  const patrimonioLiq = cuentasTotal + invTotal;

  const addSnapshot = async () => {
    await setHistory([...history, {
      date:       todayStr(),
      inv:        parseFloat(invTotal.toFixed(2)),
      cuentas:    parseFloat(cuentasTotal.toFixed(2)),
      patrimonio: parseFloat(patrimonioLiq.toFixed(2)),
    }]);
  };

  /* Actualizar precios de mercado */
  const updateMarketPrices = async () => {
    setUpdatingPrices(true);
    setPriceMsg(null);
    try {
      const res  = await fetch('/api/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funds: funds.map(f => ({ id: f.id, isin: f.isin, short: f.short, type: f.type, m: f.m })) }),
      });
      const { results } = await res.json();

      let updated = 0;
      const newFunds = funds.map(f => {
        const r = results.find((x: any) => x.isin === f.isin);
        if (!r || r.changePercent === null) return f;
        // Aplicamos el % de cambio diario al valor de mercado actual
        const newM = f.m * (1 + r.changePercent / 100);
        updated++;
        return { ...f, m: parseFloat(newM.toFixed(2)), r: f.inv > 0 ? (newM - f.inv) / f.inv * 100 : 0 };
      });

      await setFunds(newFunds);
      await setData({ ...data, lastUpd: todayStr() });
      setPriceMsg(`✓ ${updated} fondos actualizados`);
      setTimeout(() => setPriceMsg(null), 4000);
    } catch {
      setPriceMsg('Error al obtener precios');
      setTimeout(() => setPriceMsg(null), 4000);
    } finally {
      setUpdatingPrices(false);
    }
  };

  /* Confirmar aportación programada */
  const handleConfirmAportacion = async (
    contrib: RecurringContribution,
    newFunds: typeof funds,
    newOps: Operation[]
  ) => {
    await setFunds(newFunds);
    await setOperations(newOps);
    await setRecurring(recurring.map(r => r.id === contrib.id ? contrib : r));
  };

  if (!loaded) {
    return (
      <div style={{ background: '#0a0f1e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569', fontSize: 14 }}>Cargando datos…</p>
      </div>
    );
  }

  const S = {
    wrap:   { background: '#0a0f1e', minHeight: '100vh', fontFamily: '"DM Sans",system-ui,sans-serif', color: '#e2e8f0' },
    btn:    { fontSize: 12, padding: '8px 16px', border: '1px solid #1f2937', borderRadius: 8, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' } as React.CSSProperties,
  };

  return (
    <div style={S.wrap}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '1px solid #1f2937', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em', margin: 0 }}>Posición Financiera</h1>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Actualizado: {data.lastUpd}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={S.btn} onClick={() => setModal('patrimonio')}>↑ Patrimonio</button>
          <button style={S.btn} onClick={() => setModal('inversiones')}>↑ Inversiones</button>
          <button style={S.btn} onClick={() => setModal('add')}>+ Fondo</button>
          <button style={S.btn} onClick={addSnapshot} title="Guardar foto del patrimonio en este momento">📌 Snapshot</button>
          <button
            onClick={updateMarketPrices}
            disabled={updatingPrices}
            title="Actualizar valoración de fondos con precios de mercado"
            style={{ ...S.btn, color: updatingPrices ? '#475569' : '#10b981', borderColor: '#10b98133', opacity: updatingPrices ? 0.6 : 1 }}
          >
            {updatingPrices ? '⟳ Actualizando…' : priceMsg ?? '⟳ Precios'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, paddingLeft: 8, borderLeft: '1px solid #1f2937' }}>
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || ''}
                referrerPolicy="no-referrer"
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #334155', objectFit: 'cover' }}
              />
            )}
            <button onClick={logout} style={{ fontSize: 11, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 1, padding: '0 1.5rem', borderBottom: '1px solid #1f2937', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            color: tab === t.id ? '#f1f5f9' : '#64748b',
            padding: '10px 20px', fontSize: 13,
            fontWeight: tab === t.id ? 700 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'inherit', transition: 'color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── CUERPO ── */}
      <div style={{ padding: '1.25rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>

        {/* Banner aportaciones pendientes — visible en todas las pestañas */}
        <AportacionesBanner
          recurring={recurring}
          funds={funds}
          operations={operations}
          onConfirm={handleConfirmAportacion}
        />

        {tab === 'patrimonio'  && <PatrimonioTab funds={funds} data={data} />}
        {tab === 'inversiones' && (
          <InversionesTab
            funds={funds}
            onDeleteFund={id => setFunds(funds.filter(f => f.id !== id))}
          />
        )}
        {tab === 'evolucion'   && (
          <EvolucionTab
            history={history}
            patrimonioLiquido={patrimonioLiq}
            cuentasTotal={cuentasTotal}
            invTotal={invTotal}
            onDelete={i => setHistory(history.filter((_, idx) => idx !== i))}
            onClear={() => setHistory([])}
          />
        )}
        {tab === 'noticias'    && <NoticiasTab funds={funds} />}
        {tab === 'hijos'       && <HijosTab children={children} onSave={setChildren} />}
        {tab === 'operativa'   && (
          <OperativaTab
            operations={operations}
            alerts={alerts}
            funds={funds}
            recurring={recurring}
            onSaveOps={setOperations}
            onSaveAlerts={setAlerts}
            onSaveRecurring={setRecurring}
          />
        )}
      </div>

      <ModalesGlobales
        modal={modal}
        onClose={() => setModal(null)}
        funds={funds}
        data={data}
        onSaveFunds={setFunds}
        onSaveData={setData}
        onAddFund={f => setFunds([...funds, f])}
      />
    </div>
  );
}
