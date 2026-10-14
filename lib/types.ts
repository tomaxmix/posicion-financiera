export interface Fund {
  id: string;
  isin: string;
  short: string;
  type: 'RF' | 'RV' | 'MO' | 'PP' | 'ETF' | 'AC';
  m: number;      // valor mercado actual
  inv: number;    // capital invertido
  r: number;      // rentabilidad %
  targetPct?: number;    // % objetivo en cartera
  lastPriceDate?: string; // fecha del último precio o valor (YYYY-MM-DD)
  priceSource?: string;   // 'yahoo' | 'manual' (antes también 'morningstar')
  refPrice?: number;      // precio de referencia: con él se valoró el fondo la última vez (ver lib/pricing.ts)
  priceKey?: string;      // de dónde sale refPrice ('yahoo:TICKER'); si cambia, la referencia ya no vale
  broker?: Broker;        // dónde está el fondo; las capturas de un banco solo revisan sus fondos
}

export interface Cuentas {
  arquia: number;
  caixabank: number;
  traderepublic: number;
  myinvestor: number;
}

/* Banco o bróker donde está un fondo: mismas claves que Cuentas */
export type Broker = keyof Cuentas;

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
  lastPriceDate?: string; // mismos campos de precio que Fund
  priceSource?: string;
  refPrice?: number;
  priceKey?: string;
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

/* Respuesta de /api/market para cada ISIN */
export interface PriceQuote {
  isin: string;
  name: string;
  price: number | null;   // precio por participación
  currency: string;
  date: string | null;    // fecha real del precio (YYYY-MM-DD)
  source: 'yahoo' | 'none';
  key: string | null;     // identidad del precio, p. ej. 'yahoo:ESIH.DE'
  stale: boolean;         // el precio tiene más de 10 días
  note?: string;          // por qué no hay precio
}
