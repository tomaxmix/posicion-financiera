export const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n ?? 0));

export const fmt2 = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

export const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

export const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const COLORS_INV = [
  '#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444',
  '#ec4899','#f97316','#0891b2','#84cc16','#6366f1',
  '#e11d48','#78716c','#14b8a6','#06b6d4','#a855f7',
];

export const TYPE_LABELS: Record<string, string> = {
  RF: 'Renta Fija',
  RV: 'Renta Variable',
  MO: 'Monetario',
  PP: 'Plan Pensiones',
  ETF: 'ETF',
  AC: 'Acción',
};

export const TYPE_COLORS: Record<string, string> = {
  RF:  '#dbeafe|#1d4ed8',
  RV:  '#dcfce7|#15803d',
  MO:  '#fef3c7|#b45309',
  PP:  '#ede9fe|#6d28d9',
  ETF: '#d1fae5|#065f46',
  AC:  '#fee2e2|#b91c1c',
};
