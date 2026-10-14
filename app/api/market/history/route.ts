import { NextRequest, NextResponse } from 'next/server';
import { findYahooTicker, hasPublicPrice, YAHOO_TICKERS } from '@/lib/tickers';

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  '1d': { range: '5d',  interval: '30m' },
  '1m': { range: '1mo', interval: '1d'  },
  '3m': { range: '3mo', interval: '1d'  },
  '6m': { range: '6mo', interval: '1wk' },
  '1y': { range: '1y',  interval: '1wk' },
  '5y': { range: '5y',  interval: '1mo' },
};

const YH = 'https://query1.finance.yahoo.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'es-ES,es;q=0.9',
};

/* ── Obtiene histórico de Yahoo Finance ── */
async function fetchYahooHistory(ticker: string, range: string, interval: string) {
  const url = `${YH}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;
  const res  = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });

  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const text = await res.text();
  if (text.startsWith('<')) throw new Error('Yahoo devolvió HTML/XML');

  const data   = JSON.parse(text);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Sin datos en Yahoo');

  const timestamps: number[] = result.timestamp || [];
  const closes: (number|null)[]  = result.indicators?.quote?.[0]?.close || [];
  const meta = result.meta || {};

  // Formatear fechas según el intervalo
  const fmtDate = (ts: number) => {
    const d = new Date(ts * 1000);
    if (interval === '30m' || interval === '15m') {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (interval === '1mo') {
      return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const points = timestamps
    .map((ts, i) => ({ date: fmtDate(ts), value: closes[i] }))
    .filter(p => p.value != null) as { date: string; value: number }[];

  return {
    points,
    currency: meta.currency || 'EUR',
    name: meta.longName || meta.shortName || ticker,
    source: 'yahoo',
  };
}

/* ── Morningstar como fallback ── */
async function fetchMorningstar(isin: string, period: string) {
  // 1. Buscar SecId
  const searchUrl = `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?` +
    `outputType=json&page=1&pageSize=5&sortOrder=LegalName%20asc` +
    `&filterDataPoints=SecId%7CName%7CPriceCurrency%7CClosePrice%7CISIN` +
    `&term=${isin}&languageId=es-ES&currencyId=EUR`;

  const searchRes = await fetch(searchUrl, {
    headers: { ...HEADERS, 'Referer': 'https://www.morningstar.es/' },
    next: { revalidate: 86400 },
  });

  const contentType = searchRes.headers.get('content-type') || '';
  if (!contentType.includes('json')) throw new Error('Morningstar no devolvió JSON');

  const searchData = await searchRes.json();
  // Solo el fondo con ese ISIN exacto: antes, si no lo encontraba, cogía el primero de la lista
  const match = (searchData?.rows || []).find((r: any) => r.ISIN === isin);
  if (!match?.SecId) throw new Error('No encontrado en Morningstar');

  // 2. Calcular fechas
  const today  = new Date();
  const daysMap: Record<string, number> = { '1d': 7, '1m': 35, '3m': 95, '6m': 185, '1y': 370, '5y': 1830 };
  const start  = new Date(today.getTime() - (daysMap[period] || 370) * 86400000).toISOString().split('T')[0];
  const end    = today.toISOString().split('T')[0];

  // 3. Serie histórica
  const histUrl = `https://tools.morningstar.es/api/rest.svc/timeseries_price/klr5zyak8x?` +
    `id=${match.SecId}%5D2%5D1%5DFUND&currencyId=EUR&idtype=Morningstar` +
    `&frequency=daily&startDate=${start}&endDate=${end}&outputType=COMPACTJSON`;

  const histRes  = await fetch(histUrl, { headers: HEADERS, next: { revalidate: 3600 } });
  const histText = await histRes.text();
  if (histText.startsWith('<')) throw new Error('Morningstar hist devolvió XML');

  const histData = JSON.parse(histText);
  const series   = histData?.[0]?.TimeSeries?.Security?.[0]?.HistoryDetail;
  if (!series?.length) throw new Error('Sin serie histórica en Morningstar');

  const fmtD = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === '5y') return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return {
    points: series.map((d: any) => ({ date: fmtD(d.EndDate), value: parseFloat(d.Value) })),
    currency: match.PriceCurrency || 'EUR',
    name: match.Name || isin,
    source: 'morningstar',
  };
}

/* ── Handler GET ── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isin   = searchParams.get('isin')   || '';
  const type   = searchParams.get('type')   || '';
  const period = searchParams.get('period') || '1y';

  if (!isin) return NextResponse.json({ error: 'ISIN requerido', points: [] }, { status: 400 });

  const { range, interval } = RANGE_MAP[period] || RANGE_MAP['1y'];
  const errors: string[] = [];

  /* 0. Sin precio público (planes de pensiones) */
  if (!hasPublicPrice(isin, type)) {
    return NextResponse.json({ error: 'Plan de pensiones: no tiene precio público en fuentes externas', points: [] });
  }

  /* 1. Override conocido → Yahoo directo */
  const knownTicker = YAHOO_TICKERS[isin];
  if (knownTicker) {
    try {
      const data = await fetchYahooHistory(knownTicker, range, interval);
      return NextResponse.json(data);
    } catch (e: any) {
      errors.push(`Override Yahoo (${knownTicker}): ${e.message}`);
    }
  }

  /* 2. Buscar ticker en Yahoo por ISIN */
  try {
    const ticker = await findYahooTicker(isin);
    if (ticker && ticker !== knownTicker) {
      const data = await fetchYahooHistory(ticker, range, interval);
      return NextResponse.json(data);
    }
  } catch (e: any) {
    errors.push(`Yahoo search: ${e.message}`);
  }

  /* 3. Morningstar como último recurso */
  try {
    const data = await fetchMorningstar(isin, period);
    return NextResponse.json(data);
  } catch (e: any) {
    errors.push(`Morningstar: ${e.message}`);
  }

  return NextResponse.json({
    error: `No se encontraron datos. Detalles: ${errors.join(' | ')}`,
    points: [],
  });
}
