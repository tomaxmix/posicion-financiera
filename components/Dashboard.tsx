'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { todayStr, fmtPct } from '@/lib/utils';
import { Operation, RecurringContribution, PriceQuote } from '@/lib/types';
import { applyQuote, MAX_JUMP, Priced } from '@/lib/pricing';
import PatrimonioTab    from './patrimonio/PatrimonioTab';
import InversionesTab   from './inversiones/InversionesTab';
import EvolucionTab     from './evolucion/EvolucionTab';
import NoticiasTab      from './noticias/NoticiasTab';
import HijosTab         from './hijos/HijosTab';
import OperativaTab     from './operativa/OperativaTab';
import ModalesGlobales  from './modales/ModalesGlobales';
import AportacionesBanner from './shared/AportacionesBanner';
import ExplorarTab from './explorar/ExplorarTab';

const TABS = [
  { id: 'patrimonio',  label: 'Patrimonio'  },
  { id: 'inversiones', label: 'Inversiones' },
  { id: 'evolucion',   label: 'Evolución'   },
  { id: 'noticias',    label: 'Noticias & IA'},
  { id: 'hijos',       label: 'Hijos'       },
  { id: 'operativa',   label: 'Operativa'   },
  { id: 'explorar',    label: '🔍 Explorar' },
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
  const [priceWarn,      setPriceWarn]     = useState<string | null>(null);

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

  /* Actualizar precios de mercado (cartera principal + fondos de los hijos).
     Se valora con el precio de referencia de cada fondo: ver lib/pricing.ts */
  const updateMarketPrices = async () => {
    setUpdatingPrices(true);
    setPriceMsg(null);
    setPriceWarn(null);
    try {
      // Una consulta por ISIN: los dos hijos comparten los mismos fondos Vanguard
      const allFunds = [...funds, ...children.flatMap(c => c.funds)];
      const unique   = [...new Map(allFunds.map(f => [f.isin, { isin: f.isin, short: f.short, type: f.type }])).values()];

      const res = await fetch('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ funds: unique }) });
      const { results } = await res.json() as { results: PriceQuote[] };
      const quotes = new Map(results.map(q => [q.isin, q]));

      // Saltos de más de ±15 % desde la referencia: pueden ser reales o un dato erróneo
      const jumps = new Map<string, string>();
      allFunds.forEach(f => {
        const o = applyQuote(f, quotes.get(f.isin));
        if (o.outcome === 'jump') jumps.set(f.isin, `• ${f.short}: ${fmtPct((o.jump ?? 0) * 100)} desde el ${f.lastPriceDate ?? '—'}`);
      });
      const force = jumps.size > 0 && confirm(
        `Estos fondos se mueven más de un ${MAX_JUMP * 100} % desde su último precio de referencia:\n\n` +
        [...jumps.values()].join('\n') +
        `\n\nPuede ser real (si hace tiempo que no actualizas) o un dato erróneo de la fuente. ¿Aplicar igualmente?`
      );

      const tally = { updated: 0, calibrated: 0, skipped: 0 };
      function run<T extends Priced & { isin: string }>(f: T): T {
        const { fund, outcome } = applyQuote(f, quotes.get(f.isin), force);
        if (outcome === 'updated')    tally.updated++;
        if (outcome === 'calibrated') tally.calibrated++;
        if (outcome === 'jump')       tally.skipped++;
        return fund;
      }
      await setFunds(funds.map(run));
      await setChildren(children.map(c => ({ ...c, funds: c.funds.map(run) })));
      await setData({ ...data, lastUpd: todayStr() });

      const parts = [`✓ ${tally.updated} actualizados`];
      if (tally.calibrated) parts.push(`${tally.calibrated} calibrados`);
      if (tally.skipped)    parts.push(`${tally.skipped} sin aplicar`);
      setPriceMsg(parts.join(' · '));

      // Avisos: precios viejos, o fondos que deberían tener precio y no lo tienen
      const stale   = results.filter(q => q.stale).map(q => `${q.name} (${q.date})`);
      const missing = results.filter(q => !q.price && q.note !== 'sin precio público').map(q => q.name);
      const warn = [
        stale.length   ? `precio antiguo: ${stale.join(', ')}` : '',
        missing.length ? `sin precio: ${missing.join(', ')}`   : '',
      ].filter(Boolean).join(' · ');
      if (warn) setPriceWarn(`⚠ ${warn}`);

      setTimeout(() => setPriceMsg(null), 5000);
      setTimeout(() => setPriceWarn(null), 15000);
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

  /* Saltar aportación este mes (sin modificar capital) */
  const handleSkipAportacion = async (contrib: RecurringContribution) => {
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <button
              onClick={updateMarketPrices}
              disabled={updatingPrices}
              title="Actualizar valoración de fondos con precios de mercado"
              style={{ ...S.btn, color: updatingPrices ? '#475569' : '#10b981', borderColor: '#10b98133', opacity: updatingPrices ? 0.6 : 1 }}
            >
              {updatingPrices ? '⟳ Actualizando…' : priceMsg ?? '⟳ Precios'}
            </button>
            {priceWarn ? (
              <span style={{ fontSize: 9, color: '#f59e0b', letterSpacing: '0.04em', maxWidth: 320, textAlign: 'right' }}>
                {priceWarn}
              </span>
            ) : data.lastUpd && (
              <span style={{ fontSize: 9, color: '#334155', letterSpacing: '0.04em' }}>
                última actualización: {data.lastUpd}
              </span>
            )}
          </div>
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
          onSkip={handleSkipAportacion}
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
            children={children}
          />
        )}
        {tab === 'noticias'    && <NoticiasTab funds={funds} />}
        {tab === 'hijos'       && <HijosTab children={children} onSave={setChildren} />}
        {tab === 'explorar' && (
          <ExplorarTab
            funds={funds}
            onAddFund={(isin, name) => {
              const newFund = {
                id:    'F_' + Date.now(),
                isin,
                short: name || isin,
                type:  'RV' as const,
                m:     0,
                inv:   0,
                r:     0,
              };
              setFunds([...funds, newFund]);
            }}
          />
        )}
        {tab === 'operativa'   && (
          <OperativaTab
            operations={operations}
            alerts={alerts}
            funds={funds}
            recurring={recurring}
            onSaveOps={setOperations}
            onSaveAlerts={setAlerts}
            onSaveRecurring={setRecurring}
            onAddFund={f => setFunds([...funds, f])}
            onSaveFunds={setFunds}
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
