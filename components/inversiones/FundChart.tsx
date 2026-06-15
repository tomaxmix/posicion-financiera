'use client';

import { useState, useEffect, useRef } from 'react';
import { Fund } from '@/lib/types';
import { fmtPct } from '@/lib/utils';

declare global { interface Window { Chart: any } }

const PERIODS = [
  { id: '1d', label: '1D'  },
  { id: '1m', label: '1M'  },
  { id: '3m', label: '3M'  },
  { id: '6m', label: '6M'  },
  { id: '1y', label: '1A'  },
  { id: '5y', label: '5A'  },
];

interface ChartData {
  points: { date: string; value: number }[];
  currency: string;
  name: string;
  source: string;
}

export default function FundChart({ fund }: { fund: Fund }) {
  const [period,  setPeriod]  = useState('1y');
  const [data,    setData]    = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<any>(null);

  useEffect(() => { loadData(period); }, [period]); // eslint-disable-line

  async function loadData(p: string) {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/market/history?isin=${encodeURIComponent(fund.isin)}&type=${fund.type}&period=${p}`);
      const json = await res.json();
      if (json.error && !json.points?.length) { setError(json.error); setData(null); }
      else setData(json);
    } catch { setError('Error al cargar datos'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!data?.points?.length || !canvasRef.current) return;

    const build = () => {
      if (chartRef.current) chartRef.current.destroy();

      const pts    = data.points;
      const values = pts.map(p => p.value);
      const first  = values[0];
      const last   = values[values.length - 1];
      const isUp   = last >= first;
      const color  = isUp ? '#10b981' : '#ef4444';

      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: pts.map(p => p.date),
          datasets: [{
            data: values,
            borderColor: color,
            backgroundColor: color + '12',
            borderWidth: 2,
            pointRadius: pts.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c: any) => ` ${c.raw?.toFixed(4)} ${data.currency}`,
              },
            },
          },
          scales: {
            x: { ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { color: 'rgba(100,116,139,0.06)' } },
            y: { ticks: { color: '#475569', font: { size: 9 }, callback: (v: number) => v.toFixed(2) }, grid: { color: 'rgba(100,116,139,0.06)' } },
          },
        },
      });
    };

    if (window.Chart) build();
    else if (!document.getElementById('chartjs')) {
      const s = document.createElement('script');
      s.id = 'chartjs'; s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = build; document.head.appendChild(s);
    } else setTimeout(() => { if (window.Chart) build(); }, 600);

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]); // eslint-disable-line

  // Calcular variación del período
  const pts       = data?.points ?? [];
  const changePct = pts.length >= 2
    ? ((pts[pts.length - 1].value - pts[0].value) / pts[0].value) * 100
    : null;

  return (
    <div style={{ padding: '1rem 1.25rem 1.25rem', background: '#0a0f1e', borderTop: '1px solid #1f2937' }}>
      {/* Header: nombre + fuente + variación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{data?.name || fund.short}</div>
          {data?.source && (
            <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>
              Fuente: {data.source === 'yahoo' ? 'Yahoo Finance' : 'Morningstar'} · {data.currency}
            </div>
          )}
        </div>
        {changePct !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: changePct >= 0 ? '#10b981' : '#ef4444' }}>
              {fmtPct(changePct)}
            </div>
            <div style={{ fontSize: 10, color: '#475569' }}>en el período</div>
          </div>
        )}
      </div>

      {/* Selector de período */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            border: period === p.id ? 'none' : '1px solid #1f2937',
            background: period === p.id ? '#3b82f6' : 'transparent',
            color: period === p.id ? '#fff' : '#64748b',
            fontWeight: period === p.id ? 700 : 400,
          }}>{p.label}</button>
        ))}
      </div>

      {/* Gráfico */}
      <div style={{ position: 'relative', height: 180 }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '2px solid #1f2937', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 11, color: '#475569' }}>Cargando datos de mercado…</div>
          </div>
        )}
        {error && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#475569' }}>📊 Sin datos disponibles para este período</div>
            <div style={{ fontSize: 11, color: '#334155' }}>{error}</div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
