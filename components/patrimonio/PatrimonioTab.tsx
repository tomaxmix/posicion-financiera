'use client';

import { Fund, FinancialData } from '@/lib/types';
import { fmt, fmt2 } from '@/lib/utils';
import { PatrimonioDonut, LiquidezDonut } from '@/components/shared/Charts';

interface Props { funds: Fund[]; data: FinancialData; }

export default function PatrimonioTab({ funds, data }: Props) {
  const invTotal        = funds.reduce((s, f) => s + (f.m || 0), 0);
  const cuentasTotal    = Object.values(data.cuentas).reduce((s, v) => s + (v || 0), 0);
  const inmobiliario    = data.inmobiliario.valorPiso || 0;
  const deudaTotal      = (data.deudas.hipoteca || 0) + (data.deudas.coche || 0);
  const patrimonioNeto  = cuentasTotal + invTotal + inmobiliario - deudaTotal;
  const patrimonioLiq   = cuentasTotal + invTotal;
  const totalBruto      = cuentasTotal + invTotal + inmobiliario || 1;
  const liqTotal        = cuentasTotal + invTotal || 1;
  const ltv             = inmobiliario > 0 ? (data.deudas.hipoteca / inmobiliario * 100) : 0;

  /* ── Tokens de diseño (idénticos al artefacto) ── */
  const card    = { background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: '1.25rem 1.5rem' } as React.CSSProperties;
  const cardSm  = { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '1rem 1.1rem' } as React.CSSProperties;
  const sec     = { fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '0.75rem' };
  const lbl     = { fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
  const divider = { height: 1, background: '#1f2937', margin: '1rem 0' };

  /* ── Barra de distribución reutilizable ── */
  const DistBar = ({ label, val, pct, color, right }: { label: string; val: number; pct: number; color: string; right?: string }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: 'inline-block' }} />
          {label}
        </span>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{right ?? `${pct.toFixed(1)}%`}</span>
      </div>
      <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2 }} />
      </div>
    </div>
  );

  return (
    <div>
      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Patrimonio Neto',    val: patrimonioNeto,  sub: 'Activos − Deudas',          accent: '#f8fafc', big: true },
          { label: 'Patrimonio Líquido', val: patrimonioLiq,   sub: 'Cuentas + Inversiones',      accent: '#3b82f6' },
          { label: 'Valor Inmobiliario', val: inmobiliario,    sub: 'Piso (valor mercado)',        accent: '#f59e0b' },
          { label: 'Total Deuda',        val: -deudaTotal,     sub: 'Hipoteca + Préstamo coche',  accent: '#ef4444' },
        ].map(m => (
          <div key={m.label} style={{ ...cardSm, borderColor: m.big ? '#3b82f6' : '#1f2937' }}>
            <span style={lbl}>{m.label}</span>
            <div style={{ fontSize: m.big ? 22 : 19, fontWeight: 800, color: m.accent, letterSpacing: '-0.02em' }}>
              {m.val < 0 ? '-' : ''}{fmt(Math.abs(m.val))} €
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Donuts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* Patrimonio total bruto */}
        <div style={card}>
          <div style={sec}>Patrimonio total bruto</div>
          <div style={{ position: 'relative', height: 160 }}><PatrimonioDonut cuentas={cuentasTotal} inv={invTotal} inmob={inmobiliario} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <DistBar label="Inmobiliario"      val={inmobiliario}   pct={inmobiliario / totalBruto * 100}   color="#f59e0b" />
            <DistBar label="Inversiones"       val={invTotal}       pct={invTotal / totalBruto * 100}       color="#10b981" />
            <DistBar label="Cuentas corrientes" val={cuentasTotal}  pct={cuentasTotal / totalBruto * 100}   color="#3b82f6" />
          </div>
        </div>

        {/* Patrimonio líquido */}
        <div style={card}>
          <div style={sec}>Patrimonio líquido — {fmt(patrimonioLiq)} €</div>
          <div style={{ position: 'relative', height: 160 }}><LiquidezDonut cuentas={cuentasTotal} inv={invTotal} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <DistBar label="Inversiones"        val={invTotal}     pct={invTotal / liqTotal * 100}     color="#10b981" right={`${fmt(invTotal)} € · ${(invTotal / liqTotal * 100).toFixed(1)}%`} />
            <DistBar label="Cuentas corrientes" val={cuentasTotal} pct={cuentasTotal / liqTotal * 100} color="#3b82f6" right={`${fmt(cuentasTotal)} € · ${(cuentasTotal / liqTotal * 100).toFixed(1)}%`} />
          </div>
          <div style={divider} />
          <div style={sec}>LTV hipoteca</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#94a3b8' }}>Deuda / Valor piso</span>
            <span style={{ color: ltv < 50 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{ltv.toFixed(1)}%</span>
          </div>
          <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(ltv, 100) + '%', background: ltv < 50 ? '#10b981' : '#f59e0b', borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* ── Cuentas ── */}
      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <div style={sec}>Cuentas corrientes — {fmt(cuentasTotal)} €</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
          {[
            { label: 'Arquia',        val: data.cuentas.arquia,        color: '#3b82f6' },
            { label: 'CaixaBank',     val: data.cuentas.caixabank,     color: '#06b6d4' },
            { label: 'Trade Republic',val: data.cuentas.traderepublic, color: '#10b981' },
            { label: 'MyInvestor',    val: data.cuentas.myinvestor,    color: '#8b5cf6' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0a0f1e', borderRadius: 10, padding: '0.85rem 1rem', border: `1px solid ${c.color}33` }}>
              <div style={{ fontSize: 10, color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{fmt(c.val)} €</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                {cuentasTotal > 0 ? (c.val / cuentasTotal * 100).toFixed(1) : 0}% del total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Deuda ── */}
      <div style={card}>
        <div style={sec}>Deuda — {fmt(deudaTotal)} € total</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Hipoteca vivienda', val: data.deudas.hipoteca, icon: '🏠', sub: `LTV: ${ltv.toFixed(1)}%` },
            { label: 'Préstamo coche',    val: data.deudas.coche,    icon: '🚗', sub: 'Préstamo personal' },
          ].map(d => (
            <div key={d.label} style={{ background: '#0a0f1e', borderRadius: 10, padding: '1rem', border: '1px solid #ef444422' }}>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>{d.icon} {d.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{fmt(d.val)} €</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{d.sub}</div>
              <div style={{ marginTop: 8, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: deudaTotal > 0 ? (d.val / deudaTotal * 100) + '%' : '50%', background: '#ef4444', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
