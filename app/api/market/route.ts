import { NextRequest, NextResponse } from 'next/server';

interface PriceResult {
  isin: string;
  price: number | null;
  previousClose: number | null;
  changePercent: number | null;
  currency: string;
  name: string;
  source: string;
  date: string;
}

/* ── Busca el ticker de Yahoo Finance a partir de un ISIN ── */
/* Símbolos verificados junio 2026 */
const KNOWN: Record<string, string> = {
  'IE00BFZMJT78': '0P0001FAME.F',
  'FR0000991390': '0P00002BDB.F',
  'IE0031573904': '0P00000YDD.F',
  'IE00BYX5P602': '0P0001CJGV.F',
  'IE0031786696': '0P00012I6A.F',
  'LU1984712320': '0P0001I1JP.F',
  'LU1832174962': '0P0001DKPM.F',
  'LU0348784041': 'DJER.F',
  'LU0380865021': 'XESC.DE',
  'IE00BMW42181': 'ESIH.L',
  'GRF:BME':      'GRF.MC',
  'LU1694789451': '0P0001CH1D.F',
  'IE00BD4GTQ32': 'FLXF.MU',
  // Fondos hijos (Indexa Capital vía Vanguard)
  'IE00BFPM9N11': '0P0001CBCF.F',
  'IE00BGCZ0B53': '0P0001CBCE.F',
};

async function getYahooTicker(isin: string): Promise<string | null> {
  if (KNOWN[isin]) return KNOWN[isin];
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0&listsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const quote = data?.quotes?.[0];
    return quote?.symbol || null;
  } catch { return null; }
}

/* ── Obtiene precio de Yahoo Finance a partir de un ticker ── */
async function getYahooPrice(ticker: string): Promise<{ price: number; prevClose: number; changePercent: number; currency: string; name: string } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const meta   = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price      = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose  = meta.previousClose ?? meta.chartPreviousClose;
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      price,
      prevClose,
      changePercent,
      currency: meta.currency || 'EUR',
      name: meta.longName || meta.shortName || ticker,
    };
  } catch { return null; }
}

/* ── Obtiene NAV de fondo UCITS via Morningstar ── */
async function getMorningstarPrice(isin: string): Promise<{ price: number; prevClose: number; changePercent: number; currency: string; name: string } | null> {
  try {
    // Paso 1: buscar el secId de Morningstar
    const searchRes = await fetch(
      `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?outputType=json&page=1&pageSize=5&sortOrder=LegalName%20asc&filterDataPoints=SecId%7CName%7CPriceCurrency%7CClosePrice%7CPriceDate%7CISIN&term=${isin}&languageId=es-ES&currencyId=EUR`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, next: { revalidate: 21600 } }
    );
    const searchData = await searchRes.json();
    const rows = searchData?.rows;
    if (!rows?.length) return null;

    // Buscar el que coincide exactamente con el ISIN
    const match = rows.find((r: any) => r.ISIN === isin) || rows[0];
    if (!match?.ClosePrice) return null;

    const price      = parseFloat(match.ClosePrice);
    const name       = match.Name || isin;
    const currency   = match.PriceCurrency || 'EUR';

    // Paso 2: intentar obtener también el día anterior para calcular cambio %
    // Morningstar no siempre da prevClose, así que usamos estimación 0
    return { price, prevClose: price, changePercent: 0, currency, name };
  } catch { return null; }
}

/* ── Obtiene datos históricos de Morningstar (para calcular cambio real) ── */
async function getMorningstarHistory(isin: string): Promise<{ price: number; prevClose: number; changePercent: number; currency: string; name: string } | null> {
  try {
    // Buscar SecId
    const searchRes = await fetch(
      `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?outputType=json&page=1&pageSize=5&filterDataPoints=SecId%7CName%7CPriceCurrency%7CClosePrice%7CPriceDate%7CISIN&term=${isin}&languageId=es-ES`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 21600 } }
    );
    const searchData  = await searchRes.json();
    const match       = searchData?.rows?.find((r: any) => r.ISIN === isin) || searchData?.rows?.[0];
    if (!match?.SecId) return null;

    const secId = match.SecId;

    // Obtener histórico de los últimos 5 días
    const histRes = await fetch(
      `https://tools.morningstar.es/api/rest.svc/timeseries_price/klr5zyak8x?id=${secId}%5D2%5D1%5DFUND&currencyId=EUR&idtype=Morningstar&frequency=daily&startDate=${getPastDate(7)}&endDate=${getTodayDate()}&outputType=COMPACTJSON`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 21600 } }
    );
    const histData = await histRes.json();
    const series   = histData?.[0]?.TimeSeries?.Security?.[0]?.HistoryDetail;

    if (!series || series.length < 2) {
      // Devolver solo el último precio sin cambio
      return { price: parseFloat(match.ClosePrice || 0), prevClose: parseFloat(match.ClosePrice || 0), changePercent: 0, currency: match.PriceCurrency || 'EUR', name: match.Name || isin };
    }

    const last    = parseFloat(series[series.length - 1].Value);
    const prev    = parseFloat(series[series.length - 2].Value);
    const changePct = prev > 0 ? ((last - prev) / prev) * 100 : 0;

    return { price: last, prevClose: prev, changePercent: changePct, currency: match.PriceCurrency || 'EUR', name: match.Name || isin };
  } catch { return null; }
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getPastDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/* ── Handler principal ── */
export async function POST(req: NextRequest) {
  const { funds } = await req.json() as { funds: { id: string; isin: string; short: string; type: string; m: number }[] };

  const results: PriceResult[] = await Promise.all(
    funds.map(async (fund): Promise<PriceResult> => {
      const base: PriceResult = {
        isin: fund.isin, price: null, previousClose: null,
        changePercent: null, currency: 'EUR', name: fund.short, source: 'none',
        date: getTodayDate(),
      };

      // Acciones y ETFs → Yahoo Finance
      if (fund.type === 'ETF' || fund.type === 'AC') {
        // Para Grifols usamos directamente GRF.MC
        const ticker = fund.isin === 'GRF:BME' ? 'GRF.MC' : await getYahooTicker(fund.isin);
        if (ticker) {
          const data = await getYahooPrice(ticker);
          if (data) return { ...base, price: data.price, previousClose: data.prevClose, changePercent: data.changePercent, currency: data.currency, name: data.name, source: 'yahoo' };
        }
      }

      // Fondos UCITS y otros → Morningstar
      const msData = await getMorningstarHistory(fund.isin);
      if (msData) return { ...base, price: msData.price, previousClose: msData.prevClose, changePercent: msData.changePercent, currency: msData.currency, name: msData.name, source: 'morningstar' };

      // Último recurso: Yahoo con ISIN directo
      const yahooTicker = await getYahooTicker(fund.isin);
      if (yahooTicker) {
        const data = await getYahooPrice(yahooTicker);
        if (data) return { ...base, price: data.price, previousClose: data.prevClose, changePercent: data.changePercent, currency: data.currency, name: data.name, source: 'yahoo' };
      }

      return base; // sin datos
    })
  );

  return NextResponse.json({ results });
}
