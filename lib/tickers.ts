/* ── Mapa ISIN → ticker de Yahoo Finance ──────────────────────────────────
   Una sola copia para /api/market (botón ⟳ Precios) y /api/market/history
   (gráficos). Verificados el 14/10/2026: precio en EUR y actualizado.
   Si un fondo deja de moverse, mira aquí primero: CB Infrastructure estuvo
   dos meses parado porque su ticker (FLXF.MU) dejó de cotizar en agosto. */
export const YAHOO_TICKERS: Record<string, string> = {
  'IE00BFZMJT78': '0P0001FAME.F',   // Neuberger Berman Short Dur Euro Bd
  'FR0000991390': '0P00002BDB.F',   // La Française Trésorerie ISR R
  'IE0031573904': '0P00000YDD.F',   // Brandes Global Value A EUR Acc
  'IE00BYX5P602': '0P0001CJGV.F',   // Fidelity MSCI World Index EUR P Acc H
  'IE0031786696': '0P00012I6A.F',   // Vanguard Emerging Markets Stock Index € Acc
  'LU1984712320': '0P0001I1JP.F',   // Janus Henderson Horizon Global Smaller Cos A2 EUR
  'LU1832174962': '0P0001DKPM.F',   // Indépendance AM Europe Small A (C)
  'LU0348784041': 'DJER.F',         // Allianz Oriental Income
  'LU2145461757': '0P0001KWJF.F',   // Robeco Smart Energy D EUR
  'ES0146309002': '0P0001DFE8.F',   // Horos Value Internacional FI
  'IE00BD4GTQ32': '0P00019K8H.F',   // FTGF ClearBridge Infrastructure Value A EUR Acc
  'LU1694789451': '0P0001CH1D.F',   // DNCA Invest Alpha Bonds A EUR
  'LU0380865021': 'XESC.DE',        // Xtrackers Euro Stoxx 50 1C
  'IE00BMW42181': 'ESIH.DE',        // iShares MSCI Europe Health Care (Xetra, en EUR; ESIH.L cotiza en GBP)
  'GRF:BME':      'GRF.MC',         // Grifols
  // Fondos de los hijos (Indexa Capital, clases Vanguard Institutional Plus)
  'IE00BFPM9N11': '0P00011HBM.F',   // Vanguard Global Stock Index Inst Plus EUR Acc
  'IE00BGCZ0B53': '0P00012I6E.F',   // Vanguard Global Bond Index Inst Plus EUR Hedged Acc
};

/* Productos sin precio público (planes de pensiones): solo se actualizan a mano */
const NO_PUBLIC_PRICE = new Set(['N5459']);

export const hasPublicPrice = (isin: string, type: string) =>
  type !== 'PP' && !NO_PUBLIC_PRICE.has(isin);

export const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
};

/* Ticker de Yahoo para un ISIN: primero el mapa verificado, si no, búsqueda.
   Buscar por ISIN devuelve el producto con ese código o nada; si hay varios,
   se prefieren fondos y ETFs. */
export async function findYahooTicker(isin: string): Promise<string | null> {
  if (YAHOO_TICKERS[isin]) return YAHOO_TICKERS[isin];
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=3&newsCount=0&listsCount=0`;
    const res = await fetch(url, { headers: YAHOO_HEADERS, next: { revalidate: 86400 } });
    const quotes: { symbol?: string; quoteType?: string }[] = (await res.json())?.quotes || [];
    const fund   = quotes.find(q => q.quoteType === 'MUTUALFUND' || q.quoteType === 'ETF');
    const equity = quotes.find(q => q.quoteType === 'EQUITY');
    return (fund || equity || quotes[0])?.symbol || null;
  } catch { return null; }
}
