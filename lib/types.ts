export interface Fund {
  id: string;
  isin: string;
  short: string;
  type: 'RF' | 'RV' | 'MO' | 'PP' | 'ETF' | 'AC';
  m: number;      // valor mercado actual
  inv: number;    // capital invertido
  r: number;      // rentabilidad %
  targetPct?: number; // % objetivo en cartera
}

export interface Cuentas {
  arquia: number;
  caixabank: number;
  traderepublic: number;
  myinvestor: number;
}

export interface Deudas {
  hipoteca: number;
  coche: number;
}

export interface Inmobiliario {
  valorPiso: number;
}

export interface FinancialData {
  cuentas: Cuentas;
  inmobiliario: Inmobiliario;
  deudas: Deudas;
  lastUpd: string;
}

export interface HistoryEntry {
  date: string;
  inv: number;
  cuentas: number;
  patrimonio: number;
}

export interface ChildFund {
  id: string;
  isin: string;
  short: string;
  type: string;
  m: number;
  inv: number;
  r: number;
}

export interface ChildAccount {
  label: string;
  value: number;
  color: string;
}

export interface Child {
  id: string;
  name: string;
  objetivo?: number;
  objetivoLabel?: string;
  cuentas: ChildAccount[];
  funds: ChildFund[];
  history: HistoryEntry[];
}

export interface Operation {
  id: string;
  date: string;
  type: 'compra' | 'venta' | 'traspaso';
  fundFrom?: string;
  fundTo?: string;
  amount: number;
  notes?: string;
}

export interface Alert {
  id: string;
  fundId: string;
  fundName: string;
  threshold: number; // % caída que dispara la alerta
  active: boolean;
}

export interface WatchlistItem {
  isin: string;
  name: string;
  type: string;
  addedDate: string;
}

export interface RecurringContribution {
  id: string;
  fundId: string;
  fundName: string;
  amount: number;       // importe mensual €
  dayOfMonth: number;   // día del mes (ej: 10)
  active: boolean;
  lastRegistered?: string; // 'MM/YYYY' del último mes registrado
}

export interface UserData {
  funds: Fund[];
  data: FinancialData;
  history: HistoryEntry[];
  children: Child[];
  operations: Operation[];
  alerts: Alert[];
  watchlist: WatchlistItem[];
  recurring: RecurringContribution[];
}
