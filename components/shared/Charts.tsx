'use client';

import { useRef, useEffect, RefObject } from 'react';
import { COLORS_INV } from '@/lib/utils';
import { Fund } from '@/lib/types';
import { HistoryEntry } from '@/lib/types';

declare global {
  interface Window { Chart: any; }
}

function useChart(ref: RefObject<HTMLCanvasElement | null>, configFn: () => object, deps: unknown[]) {
  const inst = useRef<any>(null);
  useEffect(() => {
    const build = () => {
      if (!window.Chart || !ref.current) return;
      if (inst.current) inst.current.destroy();
      inst.current = new window.Chart(ref.current, configFn());
    };
    if (window.Chart) build();
    else if (!document.getElementById('chartjs')) {
      const s = document.createElement('script');
      s.id = 'chartjs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = build;
      document.head.appendChild(s);
    } else setTimeout(() => { if (window.Chart) build(); }, 600);
    return () => { if (inst.current) inst.current.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const fmt2 = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

export function LineChart({ history, dataKey, color, label }: { history: HistoryEntry[]; dataKey: keyof HistoryEntry; color: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useChart(ref, () => ({
    type: 'line',
    data: {
      labels: history.map(h => h.date),
      datasets: [{
        label,
        data: history.map(h => h[dataKey]),
        borderColor: color,
        backgroundColor: color + '15',
        borderWidth: 2.5,
        pointBackgroundColor: color,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + fmt2(c.raw) + ' €' } } },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(100,116,139,0.08)' } },
        y: { ticks: { color: '#64748b', font: { size: 10 }, callback: (v: number) => (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(100,116,139,0.08)' } },
      },
    },
  }), [history, dataKey]);
  return <canvas ref={ref} />;
}

export function PatrimonioDonut({ cuentas, inv, inmob }: { cuentas: number; inv: number; inmob: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useChart(ref, () => ({
    type: 'doughnut',
    data: {
      labels: ['Cuentas', 'Inversiones', 'Inmobiliario'],
      datasets: [{ data: [cuentas, inv, inmob], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 3, borderColor: '#0a0f1e' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.label + ': ' + new Intl.NumberFormat('es-ES').format(Math.round(c.raw)) + ' €' } } },
    },
  }), [cuentas, inv, inmob]);
  return <canvas ref={ref} />;
}

export function LiquidezDonut({ cuentas, inv }: { cuentas: number; inv: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useChart(ref, () => ({
    type: 'doughnut',
    data: {
      labels: ['Cuentas', 'Inversiones'],
      datasets: [{ data: [cuentas, inv], backgroundColor: ['#3b82f6', '#10b981'], borderWidth: 3, borderColor: '#0a0f1e' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.label + ': ' + new Intl.NumberFormat('es-ES').format(Math.round(c.raw)) + ' €' } } },
    },
  }), [cuentas, inv]);
  return <canvas ref={ref} />;
}

export function InvDonut({ funds }: { funds: Fund[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useChart(ref, () => ({
    type: 'doughnut',
    data: {
      labels: funds.map(f => f.short),
      datasets: [{ data: funds.map(f => f.m), backgroundColor: COLORS_INV, borderWidth: 2, borderColor: '#0a0f1e' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ' ' + c.label + ': ' + fmt2(c.raw) + ' €' } } },
    },
  }), [funds]);
  return <canvas ref={ref} />;
}

export function BarChart({ funds }: { funds: Fund[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useChart(ref, () => {
    const s = [...funds].sort((a, b) => b.r - a.r);
    return {
      type: 'bar',
      data: {
        labels: s.map(f => f.short),
        datasets: [{ data: s.map(f => parseFloat(f.r.toFixed(2))), backgroundColor: s.map(f => f.r >= 0 ? '#10b981' : '#ef4444'), borderRadius: 3, borderWidth: 0 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => fmtPct(c.raw) } } },
        scales: {
          x: { ticks: { callback: (v: number) => v + '%', font: { size: 10 }, color: '#64748b' } },
          y: { ticks: { font: { size: 10 }, color: '#94a3b8' } },
        },
      },
    };
  }, [funds]);
  return <canvas ref={ref} />;
}
