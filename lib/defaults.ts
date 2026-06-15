import { Fund, FinancialData, HistoryEntry, Child } from './types';

const RAW_FUNDS = [
  {id:'F1', isin:'IE00BFZMJT78', short:'Neuberger Berman',   type:'RF',  m:71005.70,  inv:69269.15},
  {id:'F2', isin:'FR0000991390', short:'La Française',        type:'MO',  m:102746.14, inv:100499.13},
  {id:'F3', isin:'IE0031573904', short:'Brandes Global',      type:'RV',  m:21441.98,  inv:20000.02},
  {id:'F4', isin:'IE00BYX5P602', short:'Fidelity MSCI Wld',  type:'RV',  m:40718.64,  inv:37677.00},
  {id:'F5', isin:'IE0031786696', short:'Vanguard EM',         type:'RV',  m:32127.00,  inv:24208.45},
  {id:'F6', isin:'LU1984712320', short:'Janus Henderson',     type:'RV',  m:14756.65,  inv:13215.40},
  {id:'F7', isin:'LU1832174962', short:'Indépendance EU',     type:'RV',  m:15026.34,  inv:12862.72},
  {id:'F8', isin:'LU0348784041', short:'Allianz Oriental',    type:'RV',  m:10687.13,  inv:7999.98},
  {id:'F9', isin:'LU2145461757', short:'Robeco Smart Enrg',   type:'RV',  m:11042.21,  inv:7986.92},
  {id:'F10',isin:'N5459',        short:'MyInvestor PP',       type:'PP',  m:22727.53,  inv:19964.70},
  {id:'F11',isin:'LU0380865021', short:'EuroStoxx 50',        type:'ETF', m:6593.51,   inv:6005.57},
  {id:'F12',isin:'IE00BMW42181', short:'iShares MSCI Hlth',   type:'ETF', m:7642.83,   inv:7912.65},
  {id:'F13',isin:'GRF:BME',      short:'Grifols',             type:'AC',  m:710.88,    inv:1000.00},
  {id:'F14',isin:'LU1694789451', short:'DNCA Alpha Bonds',    type:'RF',  m:30034.42,  inv:30000.00},
  {id:'F15',isin:'IE00BD4GTQ32', short:'CB Infrastructure',   type:'RV',  m:16370.74,  inv:16499.98},
] as const;

export const DEFAULT_FUNDS: Fund[] = RAW_FUNDS.map(f => ({
  ...f,
  r: (f.m - f.inv) / f.inv * 100,
}));

export const DEFAULT_DATA: FinancialData = {
  cuentas: { arquia: 18232, caixabank: 23579, traderepublic: 38502, myinvestor: 9308 },
  inmobiliario: { valorPiso: 750000 },
  deudas: { hipoteca: 65249, coche: 15914 },
  lastUpd: '17/05/2026',
};

export const DEFAULT_HISTORY: HistoryEntry[] = [
  { date: '26/04/2026', inv: 378900.29, cuentas: 90324, patrimonio: 469224.29 },
  { date: '03/05/2026', inv: 395484.71, cuentas: 90324, patrimonio: 485808.71 },
  { date: '17/05/2026', inv: 403631.70, cuentas: 89621, patrimonio: 493252.70 },
];

export const DEFAULT_CHILDREN: Child[] = [
  {
    id: 'simon',
    name: 'Simón',
    objetivo: 50000,
    objetivoLabel: 'Universidad / Futuro',
    cuentas: [{ label: 'Indexa Capital', value: 0, color: '#3b82f6' }],
    funds: [],
    history: [],
  },
  {
    id: 'felix',
    name: 'Félix',
    objetivo: 50000,
    objetivoLabel: 'Universidad / Futuro',
    cuentas: [{ label: 'Indexa Capital', value: 0, color: '#10b981' }],
    funds: [],
    history: [],
  },
];
