import { NextRequest, NextResponse } from 'next/server';
import { PriceQuote } from '@/lib/types';
import { findYahooTicker, hasPublicPrice, YAHOO_HEADERS } from '@/lib/tickers';

/* ── Precio actual de cada fondo (botón ⟳ Precios) ──
   Devuelve el precio por participación y su fecha real; el cálculo del valor
   lo hace el navegador con el precio de referencia de cada fondo (lib/pricing.ts).
   Solo Yahoo Finance: la API de Morningstar dejó de responder (devuelve una
   página de error), así que ya no se usa aquí. */

const STALE_DAYS = 10;   // un precio más viejo que esto se marca como antiguo

interface YahooMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  regularMarketTime?: number;
  currency?: string;
  longName?: string;
  shortName?: string;
}

async function getYahooQuote(ticker: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
      { headers: YAHOO_HEADERS, next: { revalidate: 900 } }
    );
    const meta: YahooMeta | undefined = (await res.json())?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    if (!meta || !price) return null;
    return {
      price,
      currency: meta.currency || 'EUR',
      name:     meta.longName || meta.shortName || ticker,
      // Fecha real del último precio publicado, no la de hoy
      date:     meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0] : null,
    };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const { funds } = await req.json() as { funds: { isin: string; short: string; type: string }[] };

  const results: PriceQuote[] = await Promise.all(funds.map(async (fund): Promise<PriceQuote> => {
    const base: PriceQuote = {
      isin: fund.isin, name: fund.short, price: null, currency: 'EUR',
      date: null, source: 'none', key: null, stale: false,
    };

    if (!hasPublicPrice(fund.isin, fund.type)) return { ...base, note: 'sin precio público' };

    const ticker = await findYahooTicker(fund.isin);
    if (!ticker) return { ...base, note: 'no encontrado en Yahoo' };

    const q = await getYahooQuote(ticker);
    if (!q) return { ...base, note: `Yahoo no responde para ${ticker}` };

    const ageDays = q.date ? (Date.now() - Date.parse(q.date)) / 86_400_000 : Infinity;
    return {
      ...base,
      price: q.price, currency: q.currency, date: q.date,
      source: 'yahoo', key: `yahoo:${ticker}`,
      stale: ageDays > STALE_DAYS,
    };
  }));

  return NextResponse.json({ results });
}
